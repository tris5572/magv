// @ts-expect-error テスト実行環境の Node.js API。フロントエンドでは Node.js の型を読み込まない。
import { readFileSync } from "node:fs";
import { stat, type FileInfo } from "@tauri-apps/plugin-fs";
import { strToU8, zipSync } from "fflate";
import { extractArchiveImages } from "./archive";

vi.mock("@tauri-apps/api/core", () => ({ convertFileSrc: (path: string) => path }));
vi.mock("@tauri-apps/plugin-fs", () => ({ stat: vi.fn() }));
vi.mock("node-unrar-js/esm/js/unrar.wasm?url", () => ({ default: "test:unrar.wasm" }));

const wasm = readFileSync(
  new URL("../../node_modules/node-unrar-js/esm/js/unrar.wasm", import.meta.url),
);
const pagesRar = Uint8Array.from(
  readFileSync(new URL("./__fixtures__/pages.rar", import.meta.url)),
);
const nestedRar = Uint8Array.from(
  readFileSync(new URL("./__fixtures__/nested.rar", import.meta.url)),
);
const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=",
  ),
  (c) => c.charCodeAt(0),
);
let files: Map<string, Uint8Array>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  files = new Map();
  vi.mocked(stat).mockImplementation(
    async (path) => ({ size: files.get(String(path))?.byteLength ?? 0 }) as FileInfo,
  );
  fetchMock = vi.fn(async (path: string) => {
    const bytes = path === "test:unrar.wasm" ? wasm : files.get(path);
    return bytes ? new Response(Uint8Array.from(bytes)) : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function addZip(path: string, entries: Record<string, Uint8Array>) {
  files.set(path, zipSync(entries));
}

/** 展開前のサイズ検査を、小さいファイルのヘッダーだけを書き換えて検証する。 */
function withDeclaredSizes(zip: Uint8Array, size: number): Uint8Array {
  const bytes = Uint8Array.from(zip);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index <= bytes.length - 46; index++) {
    if (view.getUint32(index, true) === 0x02014b50) view.setUint32(index + 24, size, true);
  }
  return bytes;
}

test("通常の ZIP の画像順を維持し、不要ファイルを展開しない", async () => {
  addZip("/book.zip", {
    "pages/010.png": png,
    "pages/002.png": png,
    "pages/001.png": png,
    "folder/__MACOSX/broken.zip": strToU8("broken"),
    "folder/._001.png": strToU8("resource fork"),
    "readme.txt": strToU8("ignored"),
  });
  const images = await extractArchiveImages("/book.zip");
  expect(images?.map((image) => image.name)).toEqual([
    "pages/001.png",
    "pages/002.png",
    "pages/010.png",
  ]);
  expect(new Uint8Array(await (images![0].source as Blob).arrayBuffer())).toEqual(png);
});

test("巻ごとに自然順で連結し、同じ画像名でも混ざらない", async () => {
  addZip("/collection.zip", {
    "vol10.zip": zipSync({ "010.png": png, "002.png": png }),
    "vol2.ZIP": zipSync({ "002.png": png, "001.png": png }),
    "000.png": png,
  });
  const images = await extractArchiveImages("/collection.zip");
  expect(images?.map((image) => image.name)).toEqual([
    "000.png",
    "vol2.ZIP/001.png",
    "vol2.ZIP/002.png",
    "vol10.zip/002.png",
    "vol10.zip/010.png",
  ]);
});

test("ZIP 内の RAR を実際の WASM で展開する", async () => {
  addZip("/collection.zip", { "vol2.rar": pagesRar });
  const images = await extractArchiveImages("/collection.zip");
  expect(images?.map((image) => image.name)).toEqual(["vol2.rar/002.png", "vol2.rar/010.png"]);
  for (const image of images!) {
    expect(new Uint8Array(await (image.source as Blob).arrayBuffer())).toEqual(png);
  }
});

test("RAR 内の ZIP と RAR を実際の WASM で再帰展開する", async () => {
  files.set("/collection.rar", nestedRar);
  const images = await extractArchiveImages("/collection.rar");
  expect(images?.map((image) => image.name)).toEqual([
    "vol2.rar/002.png",
    "vol2.rar/010.png",
    "vol10.zip/002.png",
    "vol10.zip/010.png",
  ]);
  for (const image of images!) {
    expect(new Uint8Array(await (image.source as Blob).arrayBuffer())).toEqual(png);
  }
});

test("先読みと通常読み込みを同時に要求しても RAR の状態が混ざらない", async () => {
  files.set("/first.rar", nestedRar);
  files.set("/second.rar", pagesRar);
  const [first, second] = await Promise.all([
    extractArchiveImages("/first.rar"),
    extractArchiveImages("/second.rar", { preload: true }),
  ]);
  expect(first).toHaveLength(4);
  expect(second?.map((image) => image.name)).toEqual(["002.png", "010.png"]);
});

test.each(["zip", "rar"])("入れ子を含む %s は先読みで部分的な結果を返さない", async (format) => {
  if (format === "zip") addZip("/collection.zip", { "cover.png": png, "vol.rar": pagesRar });
  else files.set("/collection.rar", nestedRar);
  expect(await extractArchiveImages(`/collection.${format}`, { preload: true })).toBeUndefined();
  expect(await extractArchiveImages(`/collection.${format}`)).toHaveLength(
    format === "zip" ? 3 : 4,
  );
});

test("大容量ファイルは先読み時に取得しない", async () => {
  vi.mocked(stat).mockResolvedValue({ size: 33 * 1024 * 1024 } as FileInfo);
  expect(await extractArchiveImages("/large.zip", { preload: true })).toBeUndefined();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("8階層までは展開し、それを超えたら中止する", async () => {
  let bytes = zipSync({ "page.png": png });
  for (let index = 1; index < 8; index++) bytes = zipSync({ "inner.zip": bytes });
  files.set("/allowed.zip", bytes);
  expect(await extractArchiveImages("/allowed.zip")).toHaveLength(1);
  addZip("/deep.zip", { "inner.zip": bytes });
  await expect(extractArchiveImages("/deep.zip")).rejects.toThrow("階層数が上限 (8)");
});

test("1 GiB を超えるファイルは読み込み前に中止する", async () => {
  vi.mocked(stat).mockResolvedValue({ size: 1024 ** 3 + 1 } as FileInfo);
  await expect(extractArchiveImages("/large.zip")).rejects.toThrow("サイズが上限");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("合計展開量の上限を、画像のメモリ確保より前に検査する", async () => {
  files.set(
    "/large.zip",
    withDeclaredSizes(zipSync({ "1.png": png, "2.png": png }), 600 * 1024 ** 2),
  );
  await expect(extractArchiveImages("/large.zip")).rejects.toThrow("合計展開量が上限");
});

test("壊れた内側のアーカイブは所属を付けてエラーにし、その後も別ファイルを開ける", async () => {
  addZip("/broken.zip", { "cover.png": png, "vol2.zip": strToU8("broken") });
  await expect(extractArchiveImages("/broken.zip")).rejects.toThrow("/broken.zip/vol2.zip");
  files.set("/good.rar", pagesRar);
  expect(await extractArchiveImages("/good.rar")).toHaveLength(2);
});
