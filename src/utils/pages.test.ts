import type { DataSource } from "../types/data";
import type { ViewImageMode } from "../types/image";
import { moveNextSingleImage, movePrevSingleImage } from "./pages";

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

function createMockImageProperty(type: "single" | "double"): ViewImageMode {
  if (type === "single") {
    return { type: "single", source: "" };
  }
  return { type: "double", source1: "", source2: "" };
}

describe("moveNextSingleImage", () => {
  test("データソースが undefined のとき、undefined を返すこと", () => {
    const result = moveNextSingleImage({
      index: 0,
      dataSource: undefined,
      imageProperty: createMockImageProperty("single"),
    });
    expect(result).toBeUndefined();
  });

  test("画像プロパティが undefined のとき、undefined を返すこと", () => {
    const result = moveNextSingleImage({
      index: 0,
      dataSource: createMockDataSourceByImageCount(3),
      imageProperty: undefined,
    });
    expect(result).toBeUndefined();
  });

  test("単体表示で最後の画像を表示しているとき、undefined を返すこと", () => {
    const result = moveNextSingleImage({
      index: 2,
      dataSource: createMockDataSourceByImageCount(3),
      imageProperty: createMockImageProperty("single"),
    });
    expect(result).toBeUndefined();
  });

  test("見開き表示で最後のページを表示しているとき、undefined を返すこと", () => {
    const result = moveNextSingleImage({
      index: 1,
      dataSource: createMockDataSourceByImageCount(3),
      imageProperty: createMockImageProperty("double"),
    });
    expect(result).toBeUndefined();
  });

  test("単体表示で次の画像へ移動できるとき、そのインデックスを返すこと", () => {
    const result = moveNextSingleImage({
      index: 0,
      dataSource: createMockDataSourceByImageCount(2),
      imageProperty: createMockImageProperty("single"),
    });
    expect(result).toBe(1);
  });

  test("見開き表示で次の画像へ移動できるとき、そのインデックスを返すこと", () => {
    const result = moveNextSingleImage({
      index: 0,
      dataSource: createMockDataSourceByImageCount(3),
      imageProperty: createMockImageProperty("double"),
    });
    expect(result).toBe(1);
  });
});

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
