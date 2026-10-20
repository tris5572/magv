import { atom } from "jotai";
import { type KeyboardConfig } from "../types/config";
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
    event: AppEvent.SWITCH_NEXT_SOURCE,
  },
  {
    key: "ArrowUp",
    ctrl: false,
    meta: false,
    shift: false,
    event: AppEvent.SWITCH_PREV_SOURCE,
  },
  {
    key: "r",
    ctrl: false,
    meta: false,
    shift: false,
    event: AppEvent.SWITCH_RANDOM_SOURCE,
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

const $keyboardConfigAtom = atom<KeyboardConfig[]>(DEFAULT_KEYBOARD_CONFIG);

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 外部公開 atom
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

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
  },
);
