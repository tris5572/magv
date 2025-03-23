import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AppEvent } from "../types/event";
import { handleAppEvent as handleEventZip } from "../atoms/zip";
import { handleAppEvent as handleEventImage } from "../atoms/image";
import { keyboardConfigAtom } from "../atoms/config";
import { KeyboardConfig } from "../types/config";
import { appModeAtom, isMagnifierEnabledAtom, isOpeningRenameViewAtom } from "../atoms/app";

/**
 * ユーザー操作等により発生したイベントによりアプリ操作を行うカスタムフック
 */
export function useHandleEvent() {
  const [keyboardConfig] = useAtom(keyboardConfigAtom);
  const [, handleZip] = useAtom(handleEventZip);
  const handleImage = useSetAtom(handleEventImage);
  const [openingRenameView, setOpeningRenameView] = useAtom(isOpeningRenameViewAtom);
  const [isMagnifierEnabled, setIsMagnifierEnabled] = useAtom(isMagnifierEnabledAtom);
  const appMode = useAtomValue(appModeAtom);

  // アプリの動作モードによりイベント送信先を切り替える
  const eventHandler = appMode === "zip" ? handleZip : handleImage;

  const handleEvent = (
    event: KeyboardEvent | MouseEvent | WheelEvent | AppEvent
    //payload?: number | string
  ) => {
    if (event instanceof KeyboardEvent) {
      const ev = convertKeyboardEvent(event, keyboardConfig);
      if (ev) {
        if (ev === AppEvent.OPEN_RENAME_VIEW && appMode === "zip") {
          // 画像表示モードのときはリネームビューを表示しない
          setOpeningRenameView(!openingRenameView);
        } else {
          eventHandler(ev);
        }
      }
    } else if (event instanceof WheelEvent) {
      // TODO: ホイールイベントはページ移動のみに決め打ちしているので、カスタマイズ可能にする
      if (0 < event.deltaY) {
        eventHandler(AppEvent.MOVE_NEXT_PAGE);
      } else if (event.deltaY < 0) {
        eventHandler(AppEvent.MOVE_PREV_PAGE);
      }
    } else if (event instanceof MouseEvent) {
      // ホイールがクリックされたときは、ルーペの有効/無効を切り替える
      if (event.button === 1) {
        setIsMagnifierEnabled(!isMagnifierEnabled);
      }
    } else {
      // ここでは AppEvent に絞り込まれているので、渡されたイベントを直接実行する
      eventHandler(event);
    }
  };

  return handleEvent;
}

/**
 * キーボード操作をイベントへ変換する
 *
 * 変換できなかったときは undefined を返す
 */
function convertKeyboardEvent(
  input: KeyboardEvent,
  config: KeyboardConfig[]
): AppEvent | undefined {
  for (const c of config) {
    if (
      input.key === c.key &&
      input.ctrlKey === c.ctrl &&
      input.shiftKey === c.shift &&
      input.metaKey === c.meta
    ) {
      return c.event;
    }
  }
  return undefined;
}
