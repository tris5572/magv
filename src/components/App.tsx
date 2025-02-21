import { useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import {
  openImagePathAtom,
  openPathAtom,
  useKeyboardEvent,
} from "../states/image";
import { SingleImageView } from "./SingleImageView";

export function App() {
  const [, openPath] = useAtom(openPathAtom);
  const [openImagePath] = useAtom(openImagePathAtom);
  const handleKeyboardEvent = useKeyboardEvent();

  // ファイルがドロップされたときの処理
  const handleDrop = useCallback(
    async (path: string) => {
      openPath(path);
    },
    [openPath]
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

  // キー押下のイベントを設定
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <main className="h-dvh">
      {openImagePath && openImagePath?.type === "double" ? (
        <div className="flex justify-center items-center">
          <SingleImageView path={openImagePath?.path1} />
          <SingleImageView path={openImagePath?.path2} />
        </div>
      ) : (
        <SingleImageView path={openImagePath?.path} />
      )}
    </main>
  );
}
