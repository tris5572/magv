import {
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
} from "@tauri-apps/api/window";
import { useAtom } from "jotai";
import { useState } from "react";
import {
  configDataAtom,
  windowPositionAtom,
  windowSizeAtom,
} from "../states/config";
import { storeConfigFile } from "../utils/utils";

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

  // ウィンドウを移動・リサイズしたときに設定ファイルへ保存する暫定挙動
  // TODO: 終了時のみ保存するように変更
  const storeConfig = useStoreConfig();

  const windowMoved = (position: { x: number; y: number }) => {
    setWindowPosition(position);
    storeConfig();
  };

  const windowResized = (size: { width: number; height: number }) => {
    setWindowSize(size);
    storeConfig();
  };

  return { windowMoved, windowResized };
}

/**
 * 設定ファイルを保存する関数を返すカスタムフック
 *
 * アプリの終了前などに呼び出す
 */
export function useStoreConfig() {
  const [configData] = useAtom(configDataAtom);

  return () => storeConfigFile(configData);
}
