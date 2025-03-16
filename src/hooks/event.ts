import { useAtom } from "jotai";
import { AppEvent } from "../types/event";
import { handleAppEvent } from "../atoms/zip";
import { keyboardConfigAtom } from "../atoms/config";
import { KeyboardConfig } from "../types/config";
import { isMagnifierEnabledAtom, isOpeningRenameViewAtom } from "../atoms/app";

/**
 * ユーザー操作等により発生したイベントによりアプリ操作を行うカスタムフック
 */
export function useHandleEvent() {
  const [keyboardConfig] = useAtom(keyboardConfigAtom);
  const [, handleZip] = useAtom(handleAppEvent);
  const [openingRenameView, setOpeningRenameView] = useAtom(isOpeningRenameViewAtom);
  const [isMagnifierEnabled, setIsMagnifierEnabled] = useAtom(isMagnifierEnabledAtom);

  // TODO: アプリの動作モードによりイベント送信先と挙動を切り替える

  const handleEvent = (
    event: KeyboardEvent | MouseEvent | WheelEvent | AppEvent
    //payload?: number | string
  ) => {
    if (event instanceof KeyboardEvent) {
      const ev = convertKeyboardEvent(event, keyboardConfig);
      if (ev) {
        if (ev === AppEvent.OPEN_RENAME_VIEW) {
          setOpeningRenameView(!openingRenameView);
        } else {
          handleZip(ev);
        }
      }
    } else if (event instanceof WheelEvent) {
      // TODO: ホイールイベントはページ移動のみに決め打ちしているので、カスタマイズ可能にする
      if (0 < event.deltaY) {
        handleZip(AppEvent.MOVE_NEXT_PAGE);
      } else if (event.deltaY < 0) {
        handleZip(AppEvent.MOVE_PREV_PAGE);
      }
    } else if (event instanceof MouseEvent) {
      // ホイールがクリックされたときは、ルーペの有効/無効を切り替える
      if (event.button === 1) {
        setIsMagnifierEnabled(!isMagnifierEnabled);
      }
    } else {
      // ここでは AppEvent に絞り込まれているので、渡されたイベントを直接実行する
      handleZip(event);
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
