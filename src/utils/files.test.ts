import { FileInfo, lstat } from "@tauri-apps/plugin-fs";
import { getPathKind } from "./files";

vi.mock("@tauri-apps/plugin-fs", () => {
  return {
    lstat: vi.fn(),
  };
});

describe("getPathKind", () => {
  beforeEach(() => {
    vi.mocked(lstat).mockReturnValue(Promise.resolve({ isDirectory: false } as FileInfo));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("末尾がスラッシュのとき、ディレクトリと判定されること", async () => {
    expect(await getPathKind("/a/b/c/")).toBe("directory");
  });

  test("末尾がスラッシュがないディレクトリのとき、ディレクトリと判定されること", async () => {
    vi.mocked(lstat).mockReturnValue(Promise.resolve({ isDirectory: true } as FileInfo));
    expect(await getPathKind("/a/b/c")).toBe("directory");
  });

  test.each(["jpg", "jpeg", "JPEG", "png", "webp", "gif", "bmp"])(
    "拡張子が %s のとき、画像と判定されること",
    async (ext) => {
      expect(await getPathKind(`/a/b/c.${ext}`)).toBe("image");
    }
  );

  test("拡張子が zip のとき、zip ファイルと判定されること", async () => {
    expect(await getPathKind("/a/b/c.zip")).toBe("zip");
  });

  test("拡張子がないとき、undefined が返ること", async () => {
    expect(await getPathKind("/a/b/c")).toBeUndefined();
  });

  test("不明な拡張子のとき、undefined が返ること", async () => {
    expect(await getPathKind("/a/b/c.txt")).toBeUndefined();
  });
});
