import {
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
} from "@tauri-apps/api/window";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import {
  configDataAtom,
  windowPositionAtom,
  windowSizeAtom,
} from "../states/config";
import { readConfigFile, storeConfigFile } from "../utils/utils";

/**
 * ウィンドウ操作のイベント（移動とリサイズ）を扱う関数を返すカスタムフック
 *
 * ウィンドウを移動・リサイズしたときに設定ファイルへ保存するが、起動から1秒間は行わない。
 * これは設定ファイルからの復元を保存しないための挙動。
 * TODO: 将来的にはもうちょっと何とかする。
 *
 * TODO: ウィンドウの上を掴んで位置とサイズが同時に変更されたときの保存値が重複するので対応する
 */
export function useWindowEvent() {
  const [, setWindowPosition] = useAtom(windowPositionAtom);
  const [, setWindowSize] = useAtom(windowSizeAtom);

  // 1秒経過を監視するためのもの
  const isInitialRender = useRef(true);
  const [isWarmup, setIsWarmup] = useState(true);

  // ウィンドウを移動・リサイズしたときに設定ファイルへ保存する暫定挙動
  // TODO: 終了時のみ保存するように変更
  const storeConfig = useStoreConfig();

  // 起動から1秒間は設定ファイルへ保存しないためにカウントする
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      const timerId = setTimeout(() => {
        setIsWarmup(true);
      }, 1000);
      return () => clearTimeout(timerId);
    }
    storeConfig();
  });

  const windowMoved = (position: { x: number; y: number }) => {
    setWindowPosition(position);
    if (isWarmup) {
      storeConfig();
    }
    storeConfig();
  };

  const windowResized = (size: { width: number; height: number }) => {
    setWindowSize(size);
    if (isWarmup) {
      storeConfig();
    }
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

/**
 * 設定ファイルの値からウィンドウの位置とサイズを復元するカスタムフック
 */
export function useRestoreConfig() {
  useEffect(() => {
    readConfigFile().then((config) => {
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
