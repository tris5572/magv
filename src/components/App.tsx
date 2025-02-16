import { useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import { openImagePathAtom, openPathAtom } from "../states/image";
import { SingleImageView } from "./SingleImageView";

export function App() {
  // const [key, setKey] = useState("-");
  const [, openPath] = useAtom(openPathAtom);
  const [openImagePath] = useAtom(openImagePathAtom);

  // ファイルがドロップされたときの処理
  const handleDrop = useCallback(
    async (path: string) => {
      openPath(path);
    },
    [openPath]
  );

  // キーが押されたときの処理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // setKey(event.key);
    console.log(event);
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
  }, [handleDrop]);

  // キー押下のイベントを設定
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <main className="h-dvh">
      <SingleImageView path={openImagePath} />
    </main>
  );
}
