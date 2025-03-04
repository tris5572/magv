import { atom } from "jotai";
import { Config } from "../types/config";

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 内部データ保持 atom
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * ウィンドウサイズを保持する atom
 */
const $windowSizeAtom = atom<{ width: number; height: number } | undefined>(
  undefined
);

/**
 * ウィンドウ位置を保持する atom
 */
const $windowPositionAtom = atom<{ x: number; y: number } | undefined>(
  undefined
);

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

/**
 * 保存するコンフィグデータを返す atom
 */
export const configDataAtom = atom((get) => {
  return {
    window: { size: get($windowSizeAtom), position: get($windowPositionAtom) },
  } satisfies Config;
});

/**
 * 設定ファイルから設定を読み取って初期化する atom
 */
export const initializeConfigAtom = atom(
  null,
  (_, set, config: Config | undefined) => {
    if (config?.window?.size) {
      set($windowSizeAtom, config?.window.size);
    }
    if (config?.window?.position) {
      set($windowPositionAtom, config?.window.position);
    }
  }
);
