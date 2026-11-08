import { convertFileSrc } from "@tauri-apps/api/core";
import { stat } from "@tauri-apps/plugin-fs";
import * as fflate from "fflate";
import { createExtractorFromData } from "node-unrar-js/esm/index.esm";
import unrarWasmUrl from "node-unrar-js/esm/js/unrar.wasm?url";
import type { ImageData } from "../types/data";

const IMAGE_FILE_PATTERN = /\.(jpe?g|png|gif|bmp|webp)$/i;
const ARCHIVE_FILE_PATTERN = /\.(zip|rar)$/i;
// 外側を含めた階層数。展開量には内側のアーカイブのバイト列も含める。
const MAX_ARCHIVE_DEPTH = 8;
const MAX_EXPANDED_BYTES = 1024 * 1024 * 1024;
const MAX_ENTRIES = 100_000;
const MAX_PRELOAD_BYTES = 32 * 1024 * 1024;

let unrarWasmBinaryPromise: Promise<ArrayBuffer> | undefined;
// unrar は extractor を共有するため、先読みを含めて展開処理を直列化する。
let extractionQueue: Promise<void> = Promise.resolve();

type ArchiveFormat = "zip" | "rar";

type ExtractionBudget = {
  bytes: number;
  entries: number;
  maxBytes: number;
};

type ExtractionOptions = {
  /** 小容量で、入れ子のないアーカイブだけを先読みする。対象外なら undefined を返す。 */
  preload?: boolean;
};

/**
 * パスが表示対象の画像ファイルか判定する。
 */
export function isImagePath(path: string): boolean {
  return IMAGE_FILE_PATTERN.test(path);
}

/**
 * パスが対応済みアーカイブ(zip / rar)か判定する。
 */
export function isArchivePath(path: string): boolean {
  return ARCHIVE_FILE_PATTERN.test(path);
}

/**
 * 拡張子からアーカイブ形式を判定する。
 */
export function getArchiveFormat(path: string): ArchiveFormat | undefined {
  if (path.toLowerCase().endsWith(".zip")) {
    return "zip";
  }

  if (path.toLowerCase().endsWith(".rar")) {
    return "rar";
  }

  return undefined;
}

/**
 * 入れ子の zip / rar を含む画像を、巻順・ページ順でひとつの配列へ展開する。
 * 先読みでは大容量または入れ子のあるアーカイブを読み飛ばす。
 */
export function extractArchiveImages(
  path: string,
  options: ExtractionOptions = {},
): Promise<ImageData[] | undefined> {
  const task = extractionQueue.then(async () => {
    const format = getArchiveFormat(path);
    if (!format) {
      throw new Error("未対応のアーカイブ形式");
    }

    const maxBytes = options.preload ? MAX_PRELOAD_BYTES : MAX_EXPANDED_BYTES;
    const info = await stat(path);
    if (info.size > maxBytes) {
      if (options.preload) return undefined;
      throw new Error("アーカイブのサイズが上限 (1 GiB) を超えている");
    }

    const response = await fetch(convertFileSrc(path));
    if (!response.ok) {
      throw new Error(`アーカイブを読み込めない: ${path}`);
    }
    const data = new Uint8Array(await response.arrayBuffer());
    if (data.byteLength > maxBytes) {
      if (options.preload) return undefined;
      throw new Error("アーカイブのサイズが上限 (1 GiB) を超えている");
    }

    const budget = { bytes: 0, entries: 0, maxBytes };
    return collectArchiveImages(data, format, budget, path, "", 1, options.preload);
  });
  // 失敗したファイルがあっても、後続の読み込みは継続する。
  extractionQueue = task.then(
    () => {},
    () => {},
  );
  return task;
}

async function collectArchiveImages(
  data: Uint8Array,
  format: ArchiveFormat,
  budget: ExtractionBudget,
  archivePath: string,
  prefix: string,
  depth: number,
  preload = false,
): Promise<ImageData[] | undefined> {
  if (depth > MAX_ARCHIVE_DEPTH) {
    throw new Error(`アーカイブの階層数が上限 (${MAX_ARCHIVE_DEPTH}) を超えている: ${archivePath}`);
  }

  let entries: Map<string, Uint8Array> | undefined;
  try {
    entries =
      format === "zip"
        ? extractZipEntries(data, budget, preload)
        : await extractRarEntries(data, budget, preload);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`アーカイブ展開に失敗 (${archivePath}): ${detail}`, { cause: error });
  }
  if (!entries) return undefined;

  const images: ImageData[] = [];
  const names = [...entries.keys()].sort((a, b) => a.localeCompare(b, [], { numeric: true }));
  for (const name of names) {
    const source = entries.get(name)!;
    entries.delete(name); // 処理済みの展開データを親の一覧から解放する。
    const fullName = prefix + name;
    const childFormat = getArchiveFormat(name);
    if (childFormat) {
      const children = await collectArchiveImages(
        source,
        childFormat,
        budget,
        archivePath + "/" + name,
        fullName + "/",
        depth + 1,
      );
      for (const image of children ?? []) images.push(image);
    } else {
      images.push({
        name: fullName,
        source: new Blob([Uint8Array.from(source)]),
        orientation: undefined,
      });
    }
  }
  return images;
}

/** 不要ファイルを展開する前に除外し、宣言された展開量を検査する。 */
function reserveEntry(name: string, size: number, budget: ExtractionBudget): boolean {
  if (++budget.entries > MAX_ENTRIES) {
    throw new Error(`エントリ数が上限 (${MAX_ENTRIES}) を超えている`);
  }
  if (!isReadableArchiveEntry(name)) return false;
  if (!Number.isSafeInteger(size) || size < 0 || size > budget.maxBytes - budget.bytes) {
    throw new Error(`合計展開量が上限 (${budget.maxBytes / 1024 / 1024} MiB) を超えている`);
  }
  budget.bytes += size;
  return true;
}

function extractZipEntries(
  data: Uint8Array,
  budget: ExtractionBudget,
  preload: boolean,
): Map<string, Uint8Array> | undefined {
  let nested = false;
  // 第1走査はヘッダーだけ。すべてのエントリを検査してから実データを展開する。
  fflate.unzipSync(data, {
    filter: ({ name, originalSize }) => {
      if (reserveEntry(name, originalSize, budget) && isArchivePath(name)) nested = true;
      return false;
    },
  });
  if (preload && nested) return undefined;
  return new Map(
    Object.entries(
      fflate.unzipSync(data, {
        filter: ({ name }) => isReadableArchiveEntry(name),
      }),
    ),
  );
}

async function extractRarEntries(
  data: Uint8Array,
  budget: ExtractionBudget,
  preload: boolean,
): Promise<Map<string, Uint8Array> | undefined> {
  const extractor = await createExtractorFromData({
    data: Uint8Array.from(data).buffer,
    wasmBinary: await getUnrarWasmBinary(),
  });
  let nested = false;
  let validationError: unknown;
  // 制限超過時も最後まで走査し、unrar のネイティブオブジェクトを解放する。
  for (const header of extractor.getFileList().fileHeaders) {
    if (validationError) continue;
    try {
      const readable = reserveEntry(header.name, header.unpSize, budget);
      if (!header.flags.directory && readable && isArchivePath(header.name)) nested = true;
    } catch (error) {
      validationError = error;
    }
  }
  if (validationError) throw validationError;
  if (preload && nested) return undefined;

  const entries = new Map<string, Uint8Array>();
  // 子の RAR を開く前に、親のジェネレーターを必ず最後まで消費する。
  for (const file of extractor.extract({
    files: (header) => !header.flags.directory && isReadableArchiveEntry(header.name),
  }).files) {
    if (file.extraction) entries.set(file.fileHeader.name, file.extraction);
  }
  return entries;
}

/**
 * unrar wasm を必要になったタイミングで一度だけ読み込む。
 */
function getUnrarWasmBinary(): Promise<ArrayBuffer> {
  unrarWasmBinaryPromise ??= loadWasmBinary(unrarWasmUrl);
  return unrarWasmBinaryPromise;
}

/**
 * macOS の補助ファイル、ディレクトリ、画像でもアーカイブでもないファイルを除外する。
 */
function isReadableArchiveEntry(name: string): boolean {
  const parts = name.replaceAll("\\", "/").split("/");
  return (
    !parts.some((part) => part === "__MACOSX" || part.startsWith("._")) &&
    !name.endsWith("/") &&
    (isImagePath(name) || isArchivePath(name))
  );
}

/**
 * unrar の wasm を URL かインライン data URL から読み込む。
 */
async function loadWasmBinary(url: string): Promise<ArrayBuffer> {
  if (url.startsWith("data:")) {
    return decodeInlineDataUrl(url);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("RAR 展開用の wasm を読み込めない");
  }

  return response.arrayBuffer();
}

/**
 * Vite によりインライン化された data URL を ArrayBuffer に戻す。
 */
function decodeInlineDataUrl(dataUrl: string): ArrayBuffer {
  const prefix = "base64,";
  const index = dataUrl.indexOf(prefix);

  if (index === -1) {
    throw new Error("RAR 展開用の wasm データが不正");
  }

  const base64 = dataUrl.slice(index + prefix.length);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}
