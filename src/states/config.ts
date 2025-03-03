import { atom } from "jotai";

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 内部データ保持 atom
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * ウィンドウサイズを保持する atom
 */
const $windowSizeAtom = atom<{ width: number; height: number } | null>(null);

/**
 * ウィンドウ位置を保持する atom
 */
const $windowPositionAtom = atom<{ x: number; y: number } | null>(null);

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 外部公開 atom
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * ウィンドウサイズを設定として保存するための atom
 */
export const windowSizeAtom = atom(
  (get) => {
    return get($windowSizeAtom);
  },
  (_, set, size: { width: number; height: number }) => {
    set($windowSizeAtom, size);
  }
);

/**
 * ウィンドウ位置を設定として保存するための atom
 */
export const windowPositionAtom = atom(
  (get) => {
    return get($windowPositionAtom);
  },
  (_, set, position: { x: number; y: number }) => {
    set($windowPositionAtom, position);
  }
);

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region hooks
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
