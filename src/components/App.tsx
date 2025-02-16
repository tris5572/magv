import { useCallback, useEffect, useState } from "react";
// import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

export function App() {
  const [path, setPath] = useState("-");
  const [key, setKey] = useState("-");

  // ファイルがドロップされたときの処理
  async function handleDrop(path: string) {
    setPath(path);
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
      <div>Path: {path}</div>
    </main>
  );
}
