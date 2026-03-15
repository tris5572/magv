import { convertFileSrc } from "@tauri-apps/api/core";
import * as fflate from "fflate";
import { createExtractorFromData } from "node-unrar-js/esm/index.esm";
import unrarWasmUrl from "node-unrar-js/esm/js/unrar.wasm?url";
import type { ImageData } from "../types/data";

const IMAGE_FILE_PATTERN = /\.(jpe?g|png|gif|bmp|webp)$/i;
const ARCHIVE_FILE_PATTERN = /\.(zip|rar)$/i;
const MACOS_RESOURCE_PATH_PREFIX = "__MACOSX/";

const unrarWasmBinaryPromise = loadWasmBinary(unrarWasmUrl);

type ArchiveFormat = "zip" | "rar";

type ExtractedArchiveImage = {
  name: string;
  source: Uint8Array;
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
 * アーカイブ内の画像を UI で扱える ImageData 配列へ変換する。
 */
export async function extractArchiveImages(path: string): Promise<ImageData[]> {
  const format = getArchiveFormat(path);

  if (!format) {
    throw new Error("未対応のアーカイブ形式");
  }

  const response = await fetch(convertFileSrc(path));
  const arrayBuffer = await response.arrayBuffer();
  const images =
    format === "zip"
      ? extractZipImages(arrayBuffer)
      : await extractRarImages(arrayBuffer);

  return images.map(({ name, source }) => {
    return { name, source: new Blob([Uint8Array.from(source)]), orientation: undefined };
  });
}

/**
 * zip を展開し、表示可能な画像エントリだけを取り出す。
 */
function extractZipImages(arrayBuffer: ArrayBuffer): ExtractedArchiveImage[] {
  const unzipped = fflate.unzipSync(new Uint8Array(arrayBuffer));

  return Object.keys(unzipped)
    .filter(isDisplayableArchiveEntry)
    .sort((a, b) => a.localeCompare(b, [], { numeric: true }))
    .map((name) => {
      return {
        name,
        source: unzipped[name] as Uint8Array,
      };
    });
}

/**
 * rar を展開し、表示可能な画像エントリだけを取り出す。
 */
async function extractRarImages(arrayBuffer: ArrayBuffer): Promise<ExtractedArchiveImage[]> {
  try {
    const extractor = await createExtractorFromData({
      data: arrayBuffer,
      wasmBinary: await unrarWasmBinaryPromise,
    });

    return [...extractor.extract().files]
      .filter((file) => {
        return (
          !file.fileHeader.flags.directory &&
          isDisplayableArchiveEntry(file.fileHeader.name) &&
          file.extraction !== undefined
        );
      })
      .sort((a, b) => a.fileHeader.name.localeCompare(b.fileHeader.name, [], { numeric: true }))
      .map((file) => {
        return {
          name: file.fileHeader.name,
          source: file.extraction as Uint8Array,
        };
      });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`RAR 展開に失敗: ${detail}`);
  }
}

/**
 * macOS の補助ファイルや非画像を除外する。
 */
function isDisplayableArchiveEntry(name: string): boolean {
  return (
    !name.startsWith(MACOS_RESOURCE_PATH_PREFIX) &&
    !name.endsWith("/") &&
    isImagePath(name)
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