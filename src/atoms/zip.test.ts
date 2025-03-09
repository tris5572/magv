import { createStore } from "jotai";
import { exists } from "@tauri-apps/plugin-fs";
import {
  createExclamationAddedPath,
  getFileNameRemovedExtension,
  imageNameListAtom,
  moveFirstImageAtom,
  moveIndexAtom,
  moveNextSingleImageAtom,
  openImageIndexAtom,
} from "./zip";
import { viewingImageAtom } from "./app";

vi.mock("@tauri-apps/plugin-fs", () => {
  return {
    exists: vi.fn(),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("moveFirstImageAtom", () => {
  test("常にインデックスを0として呼び出すこと", () => {
    const store = createStore();
    const moveIndexAtomWriteSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveFirstImageAtom);
    expect(moveIndexAtomWriteSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { index: 0 }
    );
  });
});

describe("moveNextSingleImageAtom", () => {
  test("画像が表示されていないとき、何もしないこと", () => {
    const store = createStore();
    vi.spyOn(imageNameListAtom, "read").mockReturnValue([]);
    vi.spyOn(openImageIndexAtom, "read").mockReturnValue(0);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue(undefined);
    const moveIndexAtomSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveNextSingleImageAtom);
    expect(moveIndexAtomSpy).not.toHaveBeenCalled();
  });

  test("見開き表示しているとき、1枚分だけ移動すること", () => {
    const store = createStore();
    vi.spyOn(imageNameListAtom, "read").mockReturnValue(["0", "1", "2", "3"]);
    vi.spyOn(openImageIndexAtom, "read").mockReturnValue(1);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue({
      type: "double",
      source1: "",
      source2: "",
    });
    const moveIndexAtomSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveNextSingleImageAtom);
    expect(moveIndexAtomSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { index: 2 }
    );
  });

  test("1枚表示しているとき、1枚分だけ移動すること", () => {
    const store = createStore();
    vi.spyOn(imageNameListAtom, "read").mockReturnValue(["0", "1", "2", "3"]);
    vi.spyOn(openImageIndexAtom, "read").mockReturnValue(1);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue({
      type: "single",
      source: "",
    });
    const moveIndexAtomSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveNextSingleImageAtom);
    expect(moveIndexAtomSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { index: 2 }
    );
  });

  test("最後の1枚を表示しているとき、移動しないこと", () => {
    const store = createStore();
    vi.spyOn(imageNameListAtom, "read").mockReturnValue(["0", "1", "2", "3"]);
    vi.spyOn(openImageIndexAtom, "read").mockReturnValue(3);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue({
      type: "single",
      source: "",
    });
    const moveIndexAtomSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveNextSingleImageAtom);
    expect(moveIndexAtomSpy).not.toHaveBeenCalled();
  });

  test("最後の2枚を見開き表示しているとき、移動しないこと", () => {
    const store = createStore();
    vi.spyOn(imageNameListAtom, "read").mockReturnValue(["0", "1", "2", "3"]);
    vi.spyOn(openImageIndexAtom, "read").mockReturnValue(2);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue({
      type: "double",
      source1: "",
      source2: "",
    });
    const moveIndexAtomSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveNextSingleImageAtom);
    expect(moveIndexAtomSpy).not.toHaveBeenCalled();
  });
});

describe("Utilities", () => {
  describe("createExclamationAddedPath", () => {
    test("エクスクラメーションマークが付加されたパスが返されること", async () => {
      vi.mocked(exists).mockReturnValue(Promise.resolve(false));
      expect(await createExclamationAddedPath("/a/b/c.txt")).toBe(
        "/a/b/!c.txt"
      );
    });

    test("変更後のファイルが存在している場合、アンダースコアが付加されたパスが返されること", async () => {
      vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
      vi.mocked(exists).mockReturnValueOnce(Promise.resolve(false));
      expect(await createExclamationAddedPath("/a/b/c.txt")).toBe(
        "/a/b/!c_.txt"
      );
    });

    test("変更後のファイルが複数個存在している場合、その分だけアンダースコアが付加されたパスが返されること", async () => {
      vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
      vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
      vi.mocked(exists).mockReturnValueOnce(Promise.resolve(true));
      vi.mocked(exists).mockReturnValueOnce(Promise.resolve(false));
      expect(await createExclamationAddedPath("/a/b/c.txt")).toBe(
        "/a/b/!c___.txt"
      );
    });
  });

  describe("getFileNameRemovedExtension", () => {
    test("zip ファイルの拡張子を取り除いて返すこと", () => {
      expect(getFileNameRemovedExtension("/a/b/アーカイブ.zip")).toBe(
        "アーカイブ"
      );
    });

    test("拡張子がない場合、そのまま返すこと", () => {
      expect(getFileNameRemovedExtension("/a/b/アーカイブ")).toBe("アーカイブ");
    });

    test("フォルダだった場合、空文字列を返すこと", () => {
      expect(getFileNameRemovedExtension("/a/b/フォルダ/")).toBe("");
    });

    test("複数のピリオドを含む場合、最後の拡張子を除いて返すこと", () => {
      expect(getFileNameRemovedExtension("/a/b/アーカイブ.tar.zip")).toBe(
        "アーカイブ.tar"
      );
    });

    test("拡張子部分が長い文字列の場合、拡張子を取り除かずに返すこと", () => {
      expect(
        getFileNameRemovedExtension("/a/b/単なる.区切りとして使っている")
      ).toBe("単なる.区切りとして使っている");
    });

    test("途中にピリオドと長い文字列を含む場合、最後の拡張子を除いて返すこと", () => {
      expect(
        getFileNameRemovedExtension("/a/b/単なる.区切りとして使っている.zip")
      ).toBe("単なる.区切りとして使っている");
    });
  });
});
