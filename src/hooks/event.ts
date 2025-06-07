import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import {
  resetSlideshowAtom,
  slideshowCountAtom,
  slideshowIntervalAtom,
  slideshowIntervalIdAtom,
  stopSlideshowAtom,
} from "../atoms/app";
import { handleEventAtom } from "../atoms/event";
import { AppEvent } from "../types/event";

// =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =
// #region スライドショー関連
// =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =

/**
 * スライドショーを制御するカスタムフック
 */
export function useSlideshow() {
  const setCount = useSetAtom(slideshowCountAtom);
  const [intervalId, setIntervalId] = useAtom(slideshowIntervalIdAtom);
  const handleEvent = useSetAtom(handleEventAtom);
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
