import { atom } from "jotai";
import { WindowConfig, KeyboardConfig } from "../types/config";
import { AppEvent } from "../types/event";

/**
 * 右開きでのデフォルトのキーボード操作
 */
const DEFAULT_KEYBOARD_CONFIG = [
  {
    key: "ArrowLeft",
    ctrl: false,
    meta: false,
    shift: false,
    isHorizontalSwitch: true,
    event: AppEvent.MOVE_NEXT_PAGE,
  },
  {
    key: "ArrowRight",
    ctrl: false,
    meta: false,
    shift: false,
    isHorizontalSwitch: true,
    event: AppEvent.MOVE_PREV_PAGE,
  },
  {
    key: "ArrowLeft",
    ctrl: false,
    meta: false,
    shift: true,
    isHorizontalSwitch: true,
    event: AppEvent.MOVE_NEXT_SINGLE_IMAGE,
  },
  {
    key: "ArrowRight",
    ctrl: false,
    meta: false,
    shift: true,
    isHorizontalSwitch: true,
    event: AppEvent.MOVE_PREV_SINGLE_IMAGE,
  },
  {
    key: "ArrowDown",
    ctrl: false,
    meta: false,
    shift: false,
    event: AppEvent.SWITCH_NEXT_ARCHIVE,
  },
  {
    key: "ArrowUp",
    ctrl: false,
    meta: false,
    shift: false,
    event: AppEvent.SWITCH_PREV_ARCHIVE,
  },
  {
    key: "r",
    ctrl: false,
    meta: false,
    shift: false,
    event: AppEvent.SWITCH_RANDOM_ARCHIVE,
  },
  {
    key: "Home",
    ctrl: false,
    meta: false,
    shift: false,
    isHorizontalSwitch: true,
    event: AppEvent.MOVE_LAST_PAGE,
  },
  {
    key: "ArrowLeft",
    ctrl: false,
    meta: true,
    shift: false,
    isHorizontalSwitch: true,
    event: AppEvent.MOVE_LAST_PAGE,
  },
  {
    key: "End",
    ctrl: false,
    meta: false,
    shift: false,
    isHorizontalSwitch: true,
    event: AppEvent.MOVE_FIRST_PAGE,
  },
  {
    key: "ArrowRight",
    ctrl: false,
    meta: true,
    shift: false,
    isHorizontalSwitch: true,
    event: AppEvent.MOVE_FIRST_PAGE,
  },
  {
    key: " ",
    ctrl: false,
    meta: false,
    shift: false,
    event: AppEvent.MOVE_NEXT_PAGE,
  },
  {
    key: " ",
    ctrl: false,
    meta: false,
    shift: true,
    event: AppEvent.MOVE_PREV_PAGE,
  },
  {
    key: "!",
    ctrl: false,
    meta: false,
    shift: true,
    event: AppEvent.ADD_EXCLAMATION_MARK,
  },
  {
    key: "Enter",
    ctrl: false,
    meta: false,
    shift: false,
    event: AppEvent.OPEN_RENAME_VIEW,
  },
  {
    key: "f",
    ctrl: false,
    meta: false,
    shift: false,
    event: AppEvent.SEARCH_FILE_NAME,
  },
] satisfies KeyboardConfig[];

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 内部データ保持 atom
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * ウィンドウサイズを保持する atom
 */
const $windowSizeAtom = atom<{ width: number; height: number } | undefined>(undefined);

/**
 * ウィンドウ位置を保持する atom
 */
const $windowPositionAtom = atom<{ x: number; y: number } | undefined>(undefined);

const $keyboardConfigAtom = atom<KeyboardConfig[]>(DEFAULT_KEYBOARD_CONFIG);

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
 * 保存するウィンドウの位置とサイズの設定データを返す atom
 */
export const windowConfigDataAtom = atom((get) => {
  return {
    window: { size: get($windowSizeAtom), position: get($windowPositionAtom) },
  } satisfies WindowConfig;
});

/**
 * 設定ファイルから設定を読み取って初期化する atom
 */
export const initializeWindowConfigAtom = atom(null, (_, set, config: WindowConfig | undefined) => {
  if (config?.window?.size) {
    set($windowSizeAtom, config?.window.size);
  }
  if (config?.window?.position) {
    set($windowPositionAtom, config?.window.position);
  }
});

/**
 * キーボード操作の設定内容を取得する atom
 */
export const keyboardConfigAtom = atom(
  (get) => {
    return get($keyboardConfigAtom);
  },
  (_, set, config: KeyboardConfig[]) => {
    // TODO: ちゃんとセットする
    set($keyboardConfigAtom, config);
  }
);
