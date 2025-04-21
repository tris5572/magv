import { useCallback, useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AppEvent } from "../types/event";
import { handleAppEvent as handleEventZip } from "../atoms/zip";
import { handleAppEvent as handleEventImage } from "../atoms/image";
import { keyboardConfigAtom } from "../atoms/config";
import { KeyboardConfig } from "../types/config";
import {
  appModeAtom,
  isMagnifierEnabledAtom,
  isOpeningRenameViewAtom,
  pageDirectionAtom,
  resetSlideshowAtom,
  slideshowCountAtom,
  slideshowIntervalAtom,
  slideshowIntervalIdAtom,
  stopSlideshowAtom,
} from "../atoms/app";
import { getHorizontalSwitchEvent } from "../utils/event";

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
  const pageDirection = useAtomValue(pageDirectionAtom);

  // アプリの動作モードによりイベント送信先を切り替える
  const eventHandler = appMode === "zip" ? handleZip : handleImage;

  const handleEvent = useCallback(
    (
      event: KeyboardEvent | MouseEvent | WheelEvent | AppEvent
      //payload?: number | string
    ) => {
      if (event instanceof KeyboardEvent) {
        const ev = convertKeyboardEvent(event, keyboardConfig, pageDirection);
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
    },
    [
      appMode,
      eventHandler,
      isMagnifierEnabled,
      keyboardConfig,
      openingRenameView,
      pageDirection,
      setIsMagnifierEnabled,
      setOpeningRenameView,
    ]
  );

  return handleEvent;
}

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

// =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =
// #region スライドショー関連
// =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =

/**
 * スライドショーを制御するカスタムフック
 */
export function useSlideshow() {
  const setCount = useSetAtom(slideshowCountAtom);
  const [intervalId, setIntervalId] = useAtom(slideshowIntervalIdAtom);
  const handleEvent = useHandleEvent();
  const stopSlideshow = useSetAtom(stopSlideshowAtom);
  const resetSlideshow = useSetAtom(resetSlideshowAtom);
  const slideshowInterval = useAtomValue(slideshowIntervalAtom);

  /**
   * スライドショーを開始する
   */
  const start = useCallback(() => {
    // 既にインターバルが動いていれば停止する
    if (intervalId !== undefined) {
      stopSlideshow();
    }
    const id = setInterval(() => {
      setCount((prevCount) => {
        // 設定時間経過したらページ送りしてカウントをリセット
        if (slideshowInterval <= prevCount) {
          handleEvent(AppEvent.MOVE_NEXT_PAGE);
          return 0;
        } else {
          return prevCount + 100;
        }
      });
    }, 100);
    setIntervalId(id);
  }, [handleEvent, intervalId, setCount, setIntervalId, slideshowInterval, stopSlideshow]);

  /**
   * スライドショーを停止する
   */
  const stop = useCallback(() => {
    stopSlideshow();
    resetSlideshow(); // 明示的な停止なのでカウントをリセット
  }, [resetSlideshow, stopSlideshow]);

  /**
   * スライドショーの経過時間をリセットする
   */
  const reset = resetSlideshow;

  /**
   * スライドショーの更新間隔の変更を反映するための effect
   *
   * スライドショーが実行中のときのみ、スライドショーを再度開始して、更新間隔を反映させる
   */
  useEffect(() => {
    if (intervalId !== undefined) {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 更新間隔が変更になったときのみ再度開始する
  }, [slideshowInterval]);

  return { start, stop, reset };
}
