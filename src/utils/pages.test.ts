import type { DataSource } from "../types/data";
import { movePrevSingleImage } from "./pages";

const DEFAULT_DATA_SOURCE: DataSource = {
  images: [],
  siblings: [],
};

describe("movePrevSingleImage", () => {
  test("データソースが undefined のとき、undefined を返すこと", () => {
    const result = movePrevSingleImage({ index: 1, dataSource: undefined });
    expect(result).toBeUndefined();
  });

  test("インデックスが 0 のとき、undefined を返すこと", () => {
    const result = movePrevSingleImage({ index: 0, dataSource: DEFAULT_DATA_SOURCE });
    expect(result).toBeUndefined();
  });

  test("インデックスが 1 のとき、0 を返すこと", () => {
    const result = movePrevSingleImage({ index: 1, dataSource: DEFAULT_DATA_SOURCE });
    expect(result).toBe(0);
  });
});
