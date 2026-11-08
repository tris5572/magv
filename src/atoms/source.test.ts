import { createStore } from "jotai";
import type { ImageData } from "../types/data";
import { AppEvent } from "../types/event";
import { extractArchiveImages } from "../utils/archive";
import { getFileList, getPathKind } from "../utils/files";
import { singleOrDoubleAtom, viewingImageAtom } from "./app";
import { logMessageAtom } from "./log";
import {
  handleAppEvent,
  imageListAtom,
  moveIndexAtom,
  openFileAtom,
  openingImageIndexAtom,
  recentSourcePathListAtom,
} from "./source";

const nativeWindow = vi.hoisted(() => ({
  setTitle: vi.fn(async () => {}),
  setFocus: vi.fn(async () => {}),
}));
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => nativeWindow }));
vi.mock("@tauri-apps/plugin-fs", () => ({ exists: vi.fn(async () => true), rename: vi.fn() }));
vi.mock("../utils/archive", () => ({ extractArchiveImages: vi.fn() }));
vi.mock("../utils/files", () => ({
  getFileList: vi.fn(),
  getPathKind: vi.fn(),
  getFileNameRemovedExtension: vi.fn(),
}));
vi.mock("../utils/utils", () => ({
  getImageOrientation: vi.fn(async () => "portrait"),
  searchAtBrowser: vi.fn(),
}));

function makeImages(
  names = ["vol1.zip/001.png", "vol1.zip/002.png", "vol2.rar/001.png"],
): ImageData[] {
  return names.map((name) => ({ name, source: new Blob([name]), orientation: undefined }));
}

beforeEach(() => {
  vi.mocked(getPathKind).mockResolvedValue("archive");
  vi.mocked(getFileList).mockImplementation(async (path) => [path]);
  vi.mocked(extractArchiveImages).mockImplementation(async () => makeImages());
});

afterEach(() => vi.resetAllMocks());

test("連結した全画像をページ送りし、外側のアーカイブ単位で閲覧位置を復元する", async () => {
  const store = createStore();
  store.set(singleOrDoubleAtom, "single");
  await store.set(openFileAtom, "/collection.zip");
  expect(store.get(imageListAtom)).toEqual([
    "vol1.zip/001.png",
    "vol1.zip/002.png",
    "vol2.rar/001.png",
  ]);
  await store.set(handleAppEvent, AppEvent.MOVE_NEXT_PAGE);
  await store.set(handleAppEvent, AppEvent.MOVE_NEXT_PAGE);
  expect(store.get(openingImageIndexAtom)).toBe(2);
  expect(store.get(viewingImageAtom)?.type).toBe("single");
  await store.set(openFileAtom, "/other.zip");
  await store.set(openFileAtom, "/collection.zip");
  expect(store.get(openingImageIndexAtom)).toBe(2);
  expect(store.get(recentSourcePathListAtom)).toEqual(["/collection.zip", "/other.zip"]);
  expect(nativeWindow.setTitle).toHaveBeenLastCalledWith("collection.zip");
});

test("見開きは連結後の画像列を使い、巻の境界でも通常どおり表示する", async () => {
  const store = createStore();
  await store.set(openFileAtom, "/collection.zip");
  await store.set(moveIndexAtom, { index: 1 });
  expect(store.get(viewingImageAtom)).toMatchObject({ type: "double" });
});

test("上下の切替と先読みには外側のファイルパスを渡す", async () => {
  const store = createStore();
  vi.mocked(getFileList).mockResolvedValue(["/a.zip", "/b.zip", "/c.rar"]);
  await store.set(openFileAtom, "/b.zip");
  expect(extractArchiveImages).toHaveBeenCalledWith("/a.zip", { preload: true });
  expect(extractArchiveImages).toHaveBeenCalledWith("/c.rar", { preload: true });
  await store.set(handleAppEvent, AppEvent.SWITCH_NEXT_SOURCE);
  expect(nativeWindow.setTitle).toHaveBeenLastCalledWith("c.rar");
  await store.set(handleAppEvent, AppEvent.SWITCH_PREV_SOURCE);
  expect(nativeWindow.setTitle).toHaveBeenLastCalledWith("b.zip");
});

test("先読み対象外だったファイルは、通常表示で読み直して結果を共有する", async () => {
  const store = createStore();
  vi.mocked(getFileList).mockResolvedValue(["/a.zip", "/b.zip"]);
  const preloading = Promise.withResolvers<ImageData[] | undefined>();
  vi.mocked(extractArchiveImages).mockImplementation(async (path, options) => {
    if (path === "/b.zip" && options?.preload) return preloading.promise;
    return makeImages();
  });
  await store.set(openFileAtom, "/a.zip");
  const first = store.set(openFileAtom, "/b.zip");
  const second = store.set(openFileAtom, "/b.zip");
  preloading.resolve(undefined);
  await Promise.all([first, second]);
  expect(
    vi
      .mocked(extractArchiveImages)
      .mock.calls.filter(([path, options]) => path === "/b.zip" && !options?.preload),
  ).toHaveLength(1);
  expect(store.get(imageListAtom)).toHaveLength(3);
});

test("先読みが失敗しても、通常表示では再試行する", async () => {
  const store = createStore();
  vi.mocked(getFileList).mockResolvedValue(["/a.zip", "/b.zip"]);
  const preloading = Promise.withResolvers<ImageData[] | undefined>();
  vi.mocked(extractArchiveImages).mockImplementation(async (path, options) => {
    if (path === "/b.zip" && options?.preload) return preloading.promise;
    return makeImages();
  });
  await store.set(openFileAtom, "/a.zip");
  const opening = store.set(openFileAtom, "/b.zip");
  preloading.reject(new Error("preload failed"));
  await opening;
  expect(nativeWindow.setTitle).toHaveBeenLastCalledWith("b.zip");
  expect(store.get(logMessageAtom)).toBe("");
});

test("展開失敗時には前の表示を保持し、エラーを表示する", async () => {
  const store = createStore();
  await store.set(openFileAtom, "/good.zip");
  const previous = store.get(viewingImageAtom);
  vi.mocked(extractArchiveImages).mockRejectedValue(new Error("broken.zip/vol2.rar: 展開失敗"));
  await store.set(openFileAtom, "/broken.zip");
  expect(store.get(viewingImageAtom)).toBe(previous);
  expect(store.get(recentSourcePathListAtom)).toEqual(["/good.zip"]);
  expect(store.get(logMessageAtom)).toContain("broken.zip/vol2.rar");
});

test("キャッシュはストア間で共有しない", async () => {
  await createStore().set(openFileAtom, "/book.zip");
  await createStore().set(openFileAtom, "/book.zip");
  expect(extractArchiveImages).toHaveBeenCalledTimes(2);
});
