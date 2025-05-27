import { exists, FileInfo, lstat, stat } from "@tauri-apps/plugin-fs";
import {
  createExclamationAddedPath,
  createRenamedPathToExcludeExtensionName,
  dirFromPath,
  getFileNameRemovedExtension,
  getPathKind,
} from "./files";

vi.mock("@tauri-apps/plugin-fs", () => {
  return {
    lstat: vi.fn(),
    exists: vi.fn(),
    stat: vi.fn(),
  };
});

afterEach(() => {
  vi.clearAllMocks();
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

describe("dirFromPath", () => {
  beforeEach(() => {
    vi.mocked(stat).mockReturnValue(Promise.resolve({ isDirectory: false } as FileInfo));
  });

  test("ディレクトリが指定されたら、そのまま返すこと", async () => {
    vi.mocked(stat).mockReturnValue(Promise.resolve({ isDirectory: true } as FileInfo));
    expect(await dirFromPath("/a/b/c")).toBe("/a/b/c");
  });

  test("ファイルが指定されたら、その上位ディレクトリを返すこと", async () => {
    expect(await dirFromPath("/a/b/c.txt")).toBe("/a/b");
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

describe("createExclamationAddedPath", () => {
  test("エクスクラメーションマークが付加されたパスが返されること", async () => {
    vi.mocked(exists).mockReturnValue(Promise.resolve(false));
    expect(await createExclamationAddedPath("/a/b/c.txt")).toBe("/a/b/!c.txt");
  });

  test("変更後のファイルが存在している場合、アンダースコアが付加されたパスが返されること", async () => {
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(false));
    expect(await createExclamationAddedPath("/a/b/c.txt")).toBe("/a/b/!c_.txt");
  });

  test("変更後のファイルが複数個存在している場合、その分だけアンダースコアが付加されたパスが返されること", async () => {
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(false));
    expect(await createExclamationAddedPath("/a/b/c.txt")).toBe("/a/b/!c___.txt");
  });
});

describe("createRenamedPathToExcludeExtensionName", () => {
  test("リネームされたパスが返されること", async () => {
    vi.mocked(exists).mockReturnValue(Promise.resolve(false));
    expect(await createRenamedPathToExcludeExtensionName("/a/b/元の名前.txt", "変更後")).toBe(
      "/a/b/変更後.txt"
    );
  });

  test("変更後のファイルが存在している場合、アンダースコアが付加されたパスが返されること", async () => {
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(false));
    expect(await createRenamedPathToExcludeExtensionName("/a/b/元の名前.txt", "変更後")).toBe(
      "/a/b/変更後_.txt"
    );
  });

  test("変更後のファイルが複数個存在している場合、その分だけアンダースコアが付加されたパスが返されること", async () => {
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(false));
    expect(await createRenamedPathToExcludeExtensionName("/a/b/元の名前.txt", "変更後")).toBe(
      "/a/b/変更後___.txt"
    );
  });

  test("元がピリオド付きのファイル名だった場合、リネームされたパスが返されること", async () => {
    vi.mocked(exists).mockReturnValue(Promise.resolve(false));
    expect(
      await createRenamedPathToExcludeExtensionName("/a/b/ピリオドの前.と後.txt", "変更後")
    ).toBe("/a/b/変更後.txt");
  });

  test("元がピリオド付きのファイル名で、変更後のファイルが存在している場合、アンダースコアが付与されたパスが返されること", async () => {
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
    vi.mocked(exists).mockReturnValue(Promise.resolve(false));
    expect(
      await createRenamedPathToExcludeExtensionName("/a/b/ピリオドの前.と後.txt", "変更後")
    ).toBe("/a/b/変更後_.txt");
  });

  test("ピリオド付きのファイル名が指定されて、変更後のファイルが存在している場合、アンダースコアが付与されたパスが返されること", async () => {
    vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
    vi.mocked(exists).mockReturnValue(Promise.resolve(false));
    expect(
      await createRenamedPathToExcludeExtensionName("/a/b/元の名前.txt", "ピリオドの前.と後")
    ).toBe("/a/b/ピリオドの前.と後_.txt");
  });

  test("前後のファイル名が同じ場合、アンダースコアが付与していないパスが返されること", async () => {
    vi.mocked(exists).mockReturnValue(Promise.resolve(true));
    expect(await createRenamedPathToExcludeExtensionName("/a/b/元の名前.txt", "元の名前")).toBe(
      "/a/b/元の名前.txt"
    );
  });
});
