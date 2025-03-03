import { useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import {
  openImagePathAtom,
  // openPathAtom,
  useKeyboardEvent,
} from "../states/image";
import { SingleImageView } from "./SingleImageView";
import { Log } from "./Log";
import {
  handleKeyEventAtom,
  handleMouseWheelEventAtom,
  openZipAtom,
} from "../types/zip";
import { useInitialize, useWindowEvent } from "../hooks/config";

export function App() {
  // const [, openPath] = useAtom(openPathAtom);
  const [, openZip] = useAtom(openZipAtom);
  const [openImagePath] = useAtom(openImagePathAtom);
  const handleKeyboardEvent = useKeyboardEvent();
  const [, handleKeyEvent] = useAtom(handleKeyEventAtom);
  const [, handleWheelEvent] = useAtom(handleMouseWheelEventAtom);
  const { windowResized, windowMoved } = useWindowEvent();

  useInitialize();

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
    const unlistenMove = listen<{ x: number; y: number }>(
      "tauri://move",
      (event) => {
        windowMoved(event.payload);
      }
    );
    return () => {
      unlistenResize.then((f) => f());
      unlistenMove.then((f) => f());
    };
  }, [windowMoved, windowResized]);

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
    <main className="h-dvh">
      {openImagePath && openImagePath?.type === "double" ? (
        <div className="flex flex-row-reverse justify-center items-center">
          <SingleImageView source={openImagePath?.source1} />
          <SingleImageView source={openImagePath?.source2} />
        </div>
      ) : (
        <SingleImageView source={openImagePath?.source} />
      )}
      <Log />
    </main>
  );
}
