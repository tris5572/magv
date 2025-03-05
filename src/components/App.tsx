import { useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import { useKeyboardEvent } from "../states/image";
import { Log } from "./Log";
import {
  handleKeyEventAtom,
  handleMouseWheelEventAtom,
  openZipAtom,
} from "../types/zip";
import { useRestoreConfig, useWindowEvent } from "../hooks/config";
import { ImageView } from "./ImageView";
import { Indicator } from "./Indicator";

export function App() {
  // const [, openPath] = useAtom(openPathAtom);
  const [, openZip] = useAtom(openZipAtom);
  const handleKeyboardEvent = useKeyboardEvent();
  const [, handleKeyEvent] = useAtom(handleKeyEventAtom);
  const [, handleWheelEvent] = useAtom(handleMouseWheelEventAtom);
  const { windowResized, windowMoved } = useWindowEvent();

  useRestoreConfig();

  // ファイルがドロップされたときの処理
  const handleDrop = useCallback(
    async (path: string) => {
      openZip(path);
    },
    [openZip]
  );

  // キーが押されたときの処理
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      handleKeyboardEvent(event);
    },
    [handleKeyboardEvent]
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

  // キー押下のイベントを設定
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleKeyEvent);
    document.addEventListener("wheel", handleWheelEvent);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", handleKeyEvent);
      document.removeEventListener("wheel", handleWheelEvent);
    };
  }, [handleKeyDown, handleKeyEvent, handleWheelEvent]);

  return (
    <main className="h-dvh grid grid-rows-[1fr_32px]">
      <ImageView />
      <Indicator />
      <Log />
    </main>
  );
}
