import { createStore } from "jotai";
import { moveFirstImageAtom, moveIndexAtom } from "./zip";

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
