import type { ImageData } from "../types/data";
import { ArchiveImageCache } from "./archiveCache";

function images(size: number): ImageData[] {
  return [{ name: "page.png", source: new Blob([new Uint8Array(size)]), orientation: undefined }];
}

test("容量を超えると、最後に利用した順で古いものから破棄する", () => {
  const cache = new ArchiveImageCache(10);
  const first = images(4);
  cache.set("1.zip", first);
  cache.set("2.zip", images(4));
  expect(cache.get("1.zip")).toBe(first);
  cache.set("3.zip", images(4));
  expect(cache.has("1.zip")).toBe(true);
  expect(cache.has("2.zip")).toBe(false);
  expect(cache.has("3.zip")).toBe(true);
});

test("件数にも上限を設け、空のファイルでも増え続けない", () => {
  const cache = new ArchiveImageCache(10, 2);
  cache.set("1.zip", []);
  cache.set("2.zip", []);
  cache.set("3.zip", []);
  expect(cache.has("1.zip")).toBe(false);
  expect(cache.has("2.zip")).toBe(true);
  expect(cache.has("3.zip")).toBe(true);
});

test("キャッシュより大きいまとめファイルは、ほかの項目を追い出さず保持を省く", () => {
  const cache = new ArchiveImageCache(10);
  cache.set("small.zip", images(4));
  cache.set("large.zip", images(11));
  expect(cache.has("small.zip")).toBe(true);
  expect(cache.has("large.zip")).toBe(false);
});

test("同じパスを更新したときに旧データの容量を二重計上しない", () => {
  const cache = new ArchiveImageCache(10);
  cache.set("1.zip", images(8));
  cache.set("1.zip", images(2));
  cache.set("2.zip", images(8));
  expect(cache.has("1.zip")).toBe(true);
  expect(cache.has("2.zip")).toBe(true);
});
