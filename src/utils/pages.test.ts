import type { DataSource } from "../types/data";
import type { ViewImageMode } from "../types/image";
import {
  moveLastPage,
  movePrevPage,
  moveNextSingleImage,
  movePrevSingleImage,
  moveNextPage,
} from "./pages";

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

/**
 * データソースのモックデータを、画像の向きの配列から生成する
 */
function createMockDataSourceByImageOrientations(
  orientations: ("portrait" | "landscape")[]
): DataSource {
  return {
    images: orientations.map((orientation, i) => ({
      name: `${i + 1}.png`,
      source: "",
      orientation,
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

describe("moveNextPage", () => {
  test("画像プロパティが undefined のとき、undefined を返すこと", async () => {
    const result = moveNextPage({
      index: 0,
      imageProperty: undefined,
    });
    expect(result).toBeUndefined();
  });

  test("単体表示で次の画像へ移動できるとき、そのインデックスを返すこと", async () => {
    const result = moveNextPage({
      index: 0,
      imageProperty: createMockImageProperty("single"),
    });
    expect(result).toBe(1);
  });

  test("見開き表示で次の画像へ移動できるとき、そのインデックスを返すこと", async () => {
    const result = moveNextPage({
      index: 0,
      imageProperty: createMockImageProperty("double"),
    });
    expect(result).toBe(2);
  });
});

describe("movePrevPage", () => {
  test("データソースが undefined のとき、undefined を返すこと", async () => {
    const result = await movePrevPage({
      index: 0,
      dataSource: undefined,
      updateData: vi.fn(),
    });
    expect(result).toBeUndefined();
  });

  test("最初のページを表示しているとき、undefined を返すこと", async () => {
    const result = await movePrevPage({
      index: 0,
      dataSource: createMockDataSourceByImageCount(3),
      updateData: vi.fn(),
    });
    expect(result).toBeUndefined();
  });

  test("1枚目を表示しているとき、undefined を返すこと", async () => {
    const result = await movePrevPage({
      index: 0,
      dataSource: createMockDataSourceByImageCount(3),
      updateData: vi.fn(),
    });
    expect(result).toBeUndefined();
  });

  test.each<[("portrait" | "landscape")[], { index: number; forceSingle: boolean }]>([
    [["portrait", "portrait"], { index: 0, forceSingle: true }],
    [["portrait", "landscape"], { index: 0, forceSingle: true }],
    [["landscape", "portrait"], { index: 0, forceSingle: true }],
    [["landscape", "landscape"], { index: 0, forceSingle: true }],
  ])(
    "2枚目を表示していて、画像の向きが %o のとき、%o を返すこと",
    async (orientations, expected) => {
      const DATA = createMockDataSourceByImageOrientations(orientations);
      const result = await movePrevPage({
        index: 1,
        dataSource: DATA,
        updateData: vi.fn(),
      });
      expect(result).toEqual(expected);
    }
  );

  test.each<[("portrait" | "landscape")[], { index: number; forceSingle?: boolean }]>([
    [["portrait", "portrait", "portrait"], { index: 0 }],
    [["landscape", "portrait", "portrait"], { index: 1, forceSingle: true }],
    [["portrait", "landscape", "portrait"], { index: 1, forceSingle: true }],
    [["portrait", "portrait", "landscape"], { index: 0 }],
    [["landscape", "portrait", "landscape"], { index: 1, forceSingle: true }],
    [["portrait", "landscape", "landscape"], { index: 1, forceSingle: true }],
    [["landscape", "landscape", "landscape"], { index: 1, forceSingle: true }],
  ])(
    "3枚目を表示していて、画像の向きが %o のとき、%o を返すこと",
    async (orientations, expected) => {
      const DATA = createMockDataSourceByImageOrientations(orientations);
      const result = await movePrevPage({
        index: 2,
        dataSource: DATA,
        updateData: vi.fn(),
      });
      expect(result).toEqual(expected);
    }
  );
});

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

describe("moveLastPage", () => {
  const mockUpdateData = vi.fn();

  test("データソースが undefined のとき、undefined を返すこと", async () => {
    const result = await moveLastPage({
      dataSource: undefined,
      singleOrDouble: "double",
      updateData: mockUpdateData,
    });
    expect(result).toBeUndefined();
  });

  test("画像が0枚のとき、undefined を返すこと", async () => {
    const result = await moveLastPage({
      dataSource: createMockDataSourceByImageCount(0),
      singleOrDouble: "double",
      updateData: mockUpdateData,
    });
    expect(result).toBeUndefined();
  });

  test("画像が1枚のみのとき、undefined を返すこと", async () => {
    const result = await moveLastPage({
      dataSource: createMockDataSourceByImageCount(1),
      singleOrDouble: "double",
      updateData: mockUpdateData,
    });
    expect(result).toBeUndefined();
  });

  test("最後の2枚が両方とも縦画像のとき、見開き表示なら、手前のインデックスを返すこと", async () => {
    const DATA = createMockDataSourceByImageCount(2);
    DATA.images[0].orientation = "portrait";
    DATA.images[1].orientation = "portrait";

    const result = await moveLastPage({
      dataSource: DATA,
      singleOrDouble: "double",
      updateData: mockUpdateData,
    });
    expect(result).toBe(0);
  });

  test("最後の2枚が両方とも縦画像のとき、単体表示なら、最後のインデックスを返すこと", async () => {
    const DATA = createMockDataSourceByImageCount(2);
    DATA.images[0].orientation = "portrait";
    DATA.images[1].orientation = "portrait";

    const result = await moveLastPage({
      dataSource: DATA,
      singleOrDouble: "single",
      updateData: mockUpdateData,
    });
    expect(result).toBe(1);
  });

  test("最後が横画像で、手前が縦画像のとき、最後のインデックスを返すこと", async () => {
    const DATA = createMockDataSourceByImageCount(2);
    DATA.images[0].orientation = "portrait";
    DATA.images[1].orientation = "landscape";

    const result = await moveLastPage({
      dataSource: DATA,
      singleOrDouble: "double",
      updateData: mockUpdateData,
    });
    expect(result).toBe(1);
  });

  test("最後が縦画像で、手前が横画像のとき、最後のインデックスを返すこと", async () => {
    const DATA = createMockDataSourceByImageCount(2);
    DATA.images[0].orientation = "landscape";
    DATA.images[1].orientation = "portrait";

    const result = await moveLastPage({
      dataSource: DATA,
      singleOrDouble: "double",
      updateData: mockUpdateData,
    });
    expect(result).toBe(1);
  });
});
