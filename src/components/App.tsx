import { useCallback, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import { openImagePathAtom, openPathAtom } from "../states/image";

export function App() {
  const [key, setKey] = useState("-");
  const [, openPath] = useAtom(openPathAtom);
  const [openImagePath] = useAtom(openImagePathAtom);

  // ファイルがドロップされたときの処理
  async function handleDrop(path: string) {
    openPath(path);
  }

  // キーが押されたときの処理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    setKey(event.key);
  }, []);

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
  }, []);

  // キー押下のイベントを設定
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <main>
      <div>Key: {key}</div>
      <div>Path: {openImagePath}</div>
    </main>
  );
}
