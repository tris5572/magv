import { useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import { Log } from "./Log";
import { openZipAtom } from "../atoms/zip";
import { useRestoreConfig, useWindowEvent } from "../hooks/config";
import { ImageView } from "./ImageView";
import { Indicator } from "./Indicator";
import { useHandleEvent } from "../hooks/event";

export function App() {
  const [, openZip] = useAtom(openZipAtom);
  const { windowResized, windowMoved } = useWindowEvent();
  const handleEvent = useHandleEvent();

  useRestoreConfig();

  // ファイルがドロップされたときの処理
  const handleDrop = useCallback(
    async (path: string) => {
      openZip(path);
    },
    [openZip]
  );

  // ファイルをドロップしたときのイベントを設定
  useEffect(() => {
    const unlisten = listen<{ paths: string[] }>(
      "tauri://drag-drop",
      (event) => {
        handleDrop(event.payload.paths[0]);
      }
    );
    return () => {
      unlisten.then((f) => f());
    };
  }, [handleDrop]);

  // ウィンドウの移動とリサイズのイベントを設定
  useEffect(() => {
    const unlistenResize = listen<{ width: number; height: number }>(
      "tauri://resize",
      (event) => {
        windowResized(event.payload);
      }
    );
    return () => {
      unlistenResize.then((f) => f());
    };
  }, [windowResized]);
  useEffect(() => {
    const unlistenMove = listen<{ x: number; y: number }>(
      "tauri://move",
      (event) => {
        windowMoved(event.payload);
      }
    );
    return () => {
      unlistenMove.then((f) => f());
    };
  }, [windowMoved]);

  // キー押下のイベントリスナーを設定
  useEffect(() => {
    document.addEventListener("keydown", handleEvent);
    return () => {
      document.removeEventListener("keydown", handleEvent);
    };
  }, []);
  // マウスホイール操作のイベントリスナーを設定
  useEffect(() => {
    document.addEventListener("wheel", handleEvent);
    return () => {
      document.removeEventListener("wheel", handleEvent);
    };
  }, []);

  return (
    <main className="h-dvh grid grid-rows-[1fr_32px]">
      <ImageView />
      <Indicator />
      <Log />
    </main>
  );
}
