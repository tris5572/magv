import { createStore } from "jotai";
import {
  $imageNameListAtom,
  moveFirstImageAtom,
  moveIndexAtom,
  moveNextSingleImageAtom,
  $openingImageIndexAtom,
  isOpenZipAtom,
  isFirstPageAtom,
  isLastPageAtom,
  moveNextPageAtom,
} from "./zip";
import { viewingImageAtom } from "./app";

afterEach(() => {
  vi.clearAllMocks();
});

describe("isFirstPageAtom", () => {
  test("zipファイルを開いていないとき、falseを返すこと", () => {
    const store = createStore();
    vi.spyOn(isOpenZipAtom, "read").mockReturnValue(false);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(0);
    expect(store.get(isFirstPageAtom)).toBe(false);
  });

  test("最初の画像を表示しているとき、trueを返すこと", () => {
    const store = createStore();
    vi.spyOn(isOpenZipAtom, "read").mockReturnValue(true);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(0);
    expect(store.get(isFirstPageAtom)).toBe(true);
  });

  test("最初の画像以外を表示しているとき、falseを返すこと", () => {
    const store = createStore();
    vi.spyOn(isOpenZipAtom, "read").mockReturnValue(true);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(1);
    expect(store.get(isFirstPageAtom)).toBe(false);
  });
});

describe("isLastPageAtom", () => {
  test("zipファイルを開いていないとき、falseを返すこと", () => {
    const store = createStore();
    vi.spyOn(isOpenZipAtom, "read").mockReturnValue(false);
    vi.spyOn($imageNameListAtom, "read").mockReturnValue([]);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(0);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue(undefined);
    expect(store.get(isLastPageAtom)).toBe(false);
  });

  test("zipファイル内に画像がないとき、falseを返すこと", () => {
    const store = createStore();
    vi.spyOn(isOpenZipAtom, "read").mockReturnValue(true);
    vi.spyOn($imageNameListAtom, "read").mockReturnValue([]);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(0);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue(undefined);
    expect(store.get(isLastPageAtom)).toBe(false);
  });

  test("画像が1枚のみのとき、trueを返すこと", () => {
    const store = createStore();
    vi.spyOn(isOpenZipAtom, "read").mockReturnValue(true);
    vi.spyOn($imageNameListAtom, "read").mockReturnValue(["0"]);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(0);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue({ type: "single", source: "" });
    expect(store.get(isLastPageAtom)).toBe(true);
  });

  test("最後の1枚を表示しているとき、trueを返すこと", () => {
    const store = createStore();
    vi.spyOn(isOpenZipAtom, "read").mockReturnValue(true);
    vi.spyOn($imageNameListAtom, "read").mockReturnValue(["0", "1", "2"]);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(2);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue({ type: "single", source: "" });
    expect(store.get(isLastPageAtom)).toBe(true);
  });

  test("最後から2枚目を見開きで表示しているとき、trueを返すこと", () => {
    const store = createStore();
    vi.spyOn(isOpenZipAtom, "read").mockReturnValue(true);
    vi.spyOn($imageNameListAtom, "read").mockReturnValue(["0", "1", "2"]);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(1);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue({
      type: "double",
      source1: "",
      source2: "",
    });
    expect(store.get(isLastPageAtom)).toBe(true);
  });

  test("最後から2枚目を単体で表示しているとき、falseを返すこと", () => {
    const store = createStore();
    vi.spyOn(isOpenZipAtom, "read").mockReturnValue(true);
    vi.spyOn($imageNameListAtom, "read").mockReturnValue(["0", "1", "2"]);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(1);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue({ type: "single", source: "" });
    expect(store.get(isLastPageAtom)).toBe(false);
  });
});

describe("moveFirstImageAtom", () => {
  test("常にインデックスを0として呼び出すこと", () => {
    const store = createStore();
    const moveIndexAtomWriteSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveFirstImageAtom);
    expect(moveIndexAtomWriteSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      index: 0,
    });
  });
});

describe("moveNextPageAtom", () => {
  test("画像が表示されていないとき、何もしないこと", () => {
    const store = createStore();
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(0);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue(undefined);
    const moveIndexAtomSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveNextPageAtom);
    expect(moveIndexAtomSpy).not.toHaveBeenCalled();
  });

  test("単体表示中のとき、1枚分移動すること", () => {
    const store = createStore();
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(0);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue({ type: "single", source: "" });
    const moveIndexAtomSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveNextPageAtom);
    expect(moveIndexAtomSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      index: 1,
    });
  });

  test("見開き表示中のとき、2枚分移動すること", () => {
    const store = createStore();
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(0);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue({
      type: "double",
      source1: "",
      source2: "",
    });
    const moveIndexAtomSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveNextPageAtom);
    expect(moveIndexAtomSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      index: 2,
    });
  });
});

describe("moveNextSingleImageAtom", () => {
  test("画像が表示されていないとき、何もしないこと", () => {
    const store = createStore();
    vi.spyOn($imageNameListAtom, "read").mockReturnValue([]);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(0);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue(undefined);
    const moveIndexAtomSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveNextSingleImageAtom);
    expect(moveIndexAtomSpy).not.toHaveBeenCalled();
  });

  test("見開き表示しているとき、1枚分だけ移動すること", () => {
    const store = createStore();
    vi.spyOn($imageNameListAtom, "read").mockReturnValue(["0", "1", "2", "3"]);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(1);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue({
      type: "double",
      source1: "",
      source2: "",
    });
    const moveIndexAtomSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveNextSingleImageAtom);
    expect(moveIndexAtomSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      index: 2,
    });
  });

  test("1枚表示しているとき、1枚分だけ移動すること", () => {
    const store = createStore();
    vi.spyOn($imageNameListAtom, "read").mockReturnValue(["0", "1", "2", "3"]);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(1);
    vi.spyOn(viewingImageAtom, "read").mockReturnValue({
      type: "single",
      source: "",
    });
    const moveIndexAtomSpy = vi.spyOn(moveIndexAtom, "write");

    store.set(moveNextSingleImageAtom);
    expect(moveIndexAtomSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      index: 2,
    });
  });

  test("最後の1枚を表示しているとき、移動しないこと", () => {
    const store = createStore();
    vi.spyOn($imageNameListAtom, "read").mockReturnValue(["0", "1", "2", "3"]);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(3);
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
    vi.spyOn($imageNameListAtom, "read").mockReturnValue(["0", "1", "2", "3"]);
    vi.spyOn($openingImageIndexAtom, "read").mockReturnValue(2);
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
