import { getCurrentWindow, LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
import { useAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { windowConfigDataAtom, windowPositionAtom, windowSizeAtom } from "../atoms/config";
import { readConfigFile, storeConfigFile } from "../utils/utils";
import { WINDOW_CONFIG_FILE_NAME } from "../types/config";

/**
 * ウィンドウ操作のイベント（移動とリサイズ）を扱う関数を返すカスタムフック
 *
 * ウィンドウを移動・リサイズしたときに情報を atom として保持するが、起動から1秒間は行わない。
 * これは設定ファイルからの復元の移動・リサイズを反映しないための挙動。
 * TODO: 将来的には Rust 側で起動時にサイズを設定するなどで対応する。起動後にウィンドウサイズが変わる挙動も解消されるので。
 */
export function useWindowEvent() {
  const [, setWindowPosition] = useAtom(windowPositionAtom);
  const [, setWindowSize] = useAtom(windowSizeAtom);

  // 1秒経過を監視するためのもの
  const isInitialRender = useRef(true);
  const [isWarmup, setIsWarmup] = useState(true);

  // 起動直後の位置・サイズ復元を無視するため、起動から1秒間をカウントする
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      const timerId = setTimeout(() => {
        setIsWarmup(true);
      }, 1000);
      return () => clearTimeout(timerId);
    }
  });

  const windowMoved = (position: { x: number; y: number }) => {
    if (isWarmup) {
      setWindowPosition(position);
    }
  };

  const windowResized = (size: { width: number; height: number }) => {
    if (isWarmup) {
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
  const [configData] = useAtom(windowConfigDataAtom);

  const f = useCallback(() => storeConfigFile(configData, WINDOW_CONFIG_FILE_NAME), [configData]);
  return f;
}

/**
 * 設定ファイルの値からウィンドウの位置とサイズを復元するカスタムフック
 */
export function useRestoreWindowConfig() {
  useEffect(() => {
    readConfigFile(WINDOW_CONFIG_FILE_NAME).then((config) => {
      if (!config) {
        return;
      }

      const window = getCurrentWindow();
      if (config.window?.position) {
        const pos = config.window.position;
        window.setPosition(new LogicalPosition(pos.x, pos.y));
      }
      if (config.window?.size) {
        const size = config.window.size;
        window.setSize(new LogicalSize(size.width, size.height));
      }
    });
  }, []);
}
