import type { DataSource } from "../types/data";
import { movePrevSingleImage } from "./pages";

/**
 * データソースのモックデータを、画像の数から生成する
 */
function createMockDataSourceByImageCount(imageCount: number): DataSource {
  return {
  images: [...Array(imageCount)].map((i) => ({
      name: `${i + 1}.png`,
      source: "",
      orientation: "portrait",
    })),
  siblings: [],
};
}


describe("movePrevSingleImage", () => {
  test("データソースが undefined のとき、undefined を返すこと", () => {
    const result = movePrevSingleImage({ index: 1, dataSource: undefined });
    expect(result).toBeUndefined();
  });

  test("インデックスが 0 のとき、undefined を返すこと", () => {
    const result = movePrevSingleImage({
      index: 0,
      dataSource: createMockDataSourceByImageCount(3),
    });
    expect(result).toBeUndefined();
  });

  test("インデックスが 1 のとき、0 を返すこと", () => {
    const result = movePrevSingleImage({
      index: 1,
      dataSource: createMockDataSourceByImageCount(3),
    });
    expect(result).toBe(0);
  });
});
