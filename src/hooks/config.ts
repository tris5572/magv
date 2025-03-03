import {
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
} from "@tauri-apps/api/window";
import { useAtom } from "jotai";
import { useState } from "react";
import { windowPositionAtom, windowSizeAtom } from "../states/config";

/**
 * 初期化を行うカスタムフック
 *
 * 設定ファイルを読み込み、ウィンドウサイズを設定する
 */
export function useInitialize() {
  const [isDone, setIsDone] = useState(false);

  // 一度だけ実行する
  if (isDone) {
    return;
  }
  setIsDone(true);

  const window = getCurrentWindow();
  window.setPosition(new LogicalPosition(100, 100));
  window.setSize(new LogicalSize(1280, 720));

  console.log("useInitialize");
}

/**
 * ウィンドウ操作のイベント（移動とリサイズ）を扱う関数を返すカスタムフック
 */
export function useWindowEvent() {
  const [, setWindowPosition] = useAtom(windowPositionAtom);
  const [, setWindowSize] = useAtom(windowSizeAtom);

  const windowMoved = (position: { x: number; y: number }) => {
    setWindowPosition(position);
  };

  const windowResized = (size: { width: number; height: number }) => {
    setWindowSize(size);
  };

  return { windowMoved, windowResized };
}
