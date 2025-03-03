import {
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
} from "@tauri-apps/api/window";
import { useState } from "react";

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
