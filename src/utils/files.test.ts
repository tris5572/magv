import { FileInfo, lstat } from "@tauri-apps/plugin-fs";
import { getFileNameRemovedExtension, getPathKind } from "./files";

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

describe("getFileNameRemovedExtension", () => {
  test("zip ファイルの拡張子を取り除いて返すこと", () => {
    expect(getFileNameRemovedExtension("/a/b/アーカイブ.zip")).toBe("アーカイブ");
  });

  test("拡張子がない場合、そのまま返すこと", () => {
    expect(getFileNameRemovedExtension("/a/b/アーカイブ")).toBe("アーカイブ");
  });

  test("フォルダだった場合、空文字列を返すこと", () => {
    expect(getFileNameRemovedExtension("/a/b/フォルダ/")).toBe("");
  });

  test("複数のピリオドを含む場合、最後の拡張子を除いて返すこと", () => {
    expect(getFileNameRemovedExtension("/a/b/アーカイブ.tar.zip")).toBe("アーカイブ.tar");
  });

  test("拡張子部分が長い文字列の場合、拡張子を取り除かずに返すこと", () => {
    expect(getFileNameRemovedExtension("/a/b/単なる.区切りとして使っている")).toBe(
      "単なる.区切りとして使っている"
    );
  });

  test("途中にピリオドと長い文字列を含む場合、最後の拡張子を除いて返すこと", () => {
    expect(getFileNameRemovedExtension("/a/b/単なる.区切りとして使っている.zip")).toBe(
      "単なる.区切りとして使っている"
    );
  });
});
