import { atom } from "jotai";
import { KeyboardConfig } from "../types/config";
import { AppEvent } from "../types/event";
import { getHorizontalSwitchEvent } from "../utils/event";
import {
  isOpeningRenameViewAtom,
  isMagnifierEnabledAtom,
  appModeAtom,
  pageDirectionAtom,
} from "./app";
import { keyboardConfigAtom } from "./config";
import { handleAppEvent as handleEventImage } from "./image";
import { handleAppEvent as handleEventZip } from "./zip";

/**
 * イベントを処理する atom
 *
 * ユーザー操作や、実行したいイベントそのものを渡すことで、イベントを発行する。
 *
 * TODO: 必要に応じて payload を受け取れるようにする
 */
export const handleEventAtom = atom<
  null,
  [KeyboardEvent | MouseEvent | WheelEvent | AppEvent],
  void
>(null, async (get, set, event) => {
  const keyboardConfig = get(keyboardConfigAtom);
  const openingRenameView = get(isOpeningRenameViewAtom);
  const isMagnifierEnabled = get(isMagnifierEnabledAtom);
  const appMode = get(appModeAtom);
  const pageDirection = get(pageDirectionAtom);

  // アプリの動作モード(開いている種類)によりイベント送信先を切り替える
  const eventHandleAtom = appMode === "zip" ? handleEventZip : handleEventImage;

  if (event instanceof KeyboardEvent) {
    const ev = convertKeyboardEvent(event, keyboardConfig, pageDirection);
    if (ev) {
      if (ev === AppEvent.OPEN_RENAME_VIEW && appMode === "zip") {
        // 画像表示モードのときはリネームビューを表示しない
        set(isOpeningRenameViewAtom, !openingRenameView);
      } else {
        set(eventHandleAtom, ev);
      }
    }
  } else if (event instanceof WheelEvent) {
    // TODO: ホイールイベントはページ移動のみに決め打ちしているので、カスタマイズ可能にする
    if (0 < event.deltaY) {
      set(eventHandleAtom, AppEvent.MOVE_NEXT_PAGE);
    } else if (event.deltaY < 0) {
      set(eventHandleAtom, AppEvent.MOVE_PREV_PAGE);
    }
  } else if (event instanceof MouseEvent) {
    // ホイールがクリックされたときは、ルーペの有効/無効を切り替える
    if (event.button === 1) {
      set(isMagnifierEnabledAtom, !isMagnifierEnabled);
    }
  } else {
    // ここでは AppEvent に絞り込まれているので、渡されたイベントを直接実行する
    set(eventHandleAtom, event);
  }
});

/**
 * キーボード操作をイベントへ変換する
 *
 * 変換できなかったときは undefined を返す
 */
function convertKeyboardEvent(
  input: KeyboardEvent,
  config: KeyboardConfig[],
  pageDirection: "left" | "right"
): AppEvent | undefined {
  for (const c of config) {
    if (
      input.key === c.key &&
      input.ctrlKey === c.ctrl &&
      input.shiftKey === c.shift &&
      input.metaKey === c.meta
    ) {
      const ev = c.event;
      // 左右反転
      if (pageDirection === "right" && c.isHorizontalSwitch) {
        return getHorizontalSwitchEvent(ev);
      } else {
        return ev;
      }
    }
  }
  return undefined;
}
