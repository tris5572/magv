import { createStore } from "jotai";
import {
  $imageNameListAtom,
  moveFirstImageAtom,
  moveIndexAtom,
  moveNextSingleImageAtom,
  $openingImageIndexAtom,
} from "./zip";
import { viewingImageAtom } from "./app";

afterEach(() => {
  vi.clearAllMocks();
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
