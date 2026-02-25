import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { windowPositionAtom, windowSizeAtom } from "../atoms/config";
import { WINDOW_CONFIG_FILE_NAME } from "../types/config";
import { storeConfigFile } from "../utils/utils";

/**
 * ウィンドウ操作のイベント（移動とリサイズ）を扱う関数を返すカスタムフック
 *
 * ウィンドウを移動・リサイズしたときに情報を atom として保持するが、起動から1秒間は行わない。
 * これは起動直後に発生する移動・リサイズイベントを保存対象から除外するための挙動。
 */
export function useWindowEvent() {
  const [, setWindowPosition] = useAtom(windowPositionAtom);
  const [, setWindowSize] = useAtom(windowSizeAtom);

  const [isWarmup, setIsWarmup] = useState(true);

  // 起動直後の位置・サイズ復元を無視するため、起動から1秒間をカウントする
  useEffect(() => {
    const timerId = setTimeout(() => {
      setIsWarmup(false);
    }, 1000);
    return () => clearTimeout(timerId);
  }, []);

  const windowMoved = (position: { x: number; y: number }) => {
    if (!isWarmup) {
      setWindowPosition(position);
    }
  };

  const windowResized = (size: { width: number; height: number }) => {
    if (!isWarmup) {
      setWindowSize(size);
    }
  };

  return { windowMoved, windowResized };
}

/**
 * ウィンドウの位置とサイズを設定ファイルに保存する関数を返すカスタムフック
 *
 * 保存する適切なタイミング（アプリの終了時など）に呼び出す
 */
export function useStoreWindowConfig() {
  const f = useCallback(async () => {
    const appWindow = getCurrentWindow();
    const factor = await appWindow.scaleFactor();
    const size = (await appWindow.innerSize()).toLogical(factor);
    const position = (await appWindow.innerPosition()).toLogical(factor);

    await storeConfigFile(
      {
        window: { size, position },
      },
      WINDOW_CONFIG_FILE_NAME,
    );
  }, []);
  return f;
}
