import { useAtom } from "jotai";
import { AppEvent } from "../types/event";
import { handleAppEvent } from "../atoms/zip";
import { keyboardConfigAtom } from "../atoms/config";
import { KeyboardConfig } from "../types/config";
import { isOpeningRenameViewAtom } from "../atoms/app";

/**
 * ユーザー操作等により発生したイベントによりアプリ操作を行うカスタムフック
 */
export function useHandleEvent() {
  const [keyboardConfig] = useAtom(keyboardConfigAtom);
  const [, handleZip] = useAtom(handleAppEvent);
  const [openingRenameView, setOpeningRenameView] = useAtom(
    isOpeningRenameViewAtom
  );

  // TODO: アプリの動作モードによりイベント送信先と挙動を切り替える

  const handleEvent = (
    event: KeyboardEvent | WheelEvent
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
