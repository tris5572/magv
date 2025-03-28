import { useCallback, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import { Log } from "./Log";
import { openZipAtom } from "../atoms/zip";
import { useRestoreConfig, useStoreConfig, useWindowEvent } from "../hooks/config";
import { ImageView } from "./ImageView";
import { Indicator } from "./Indicator";
import { useHandleEvent } from "../hooks/event";
import { RenameBox } from "./RenameBox";
import { isOpeningRenameViewAtom } from "../atoms/app";
import { TopMenu } from "./TopMenu";
import { getPathKind } from "../utils/files";
import { openDirectoryPathAtom, openImagePathAtom } from "../atoms/image";

export function App() {
  const [isOpeningRenameView] = useAtom(isOpeningRenameViewAtom);

  useRestoreConfig();
  useEventListener();

  return (
    <main className="h-dvh grid grid-rows-[1fr_32px]">
      <ImageView />
      <TopMenu />
      <Indicator />
      {
        // 表示時にテキストボックスへフォーカスを当てるために、外部で表示/非表示を切り替えている
        isOpeningRenameView && <RenameBox />
      }
      <Log />
    </main>
  );
}

/**
 * App コンポーネントのイベントリスナーを登録するカスタムフック
 */
function useEventListener() {
  const [, openZip] = useAtom(openZipAtom);
  const openImage = useSetAtom(openImagePathAtom);
  const openDirectory = useSetAtom(openDirectoryPathAtom);
  const { windowResized, windowMoved } = useWindowEvent();
  const storeConfig = useStoreConfig();
  const handleEvent = useHandleEvent();

  // ファイルがドロップされたときの処理
  const handleDrop = useCallback(
    async (path: string) => {
      const kind = await getPathKind(path);
      if (kind === "zip") {
        openZip(path);
      } else if (kind === "image") {
        openImage(path);
      } else if (kind === "directory") {
        openDirectory(path);
      }
    },
    [openDirectory, openImage, openZip]
  );

  // ファイルをドロップしたときのリスナーを設定
  useEffect(() => {
    const unlisten = listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
      handleDrop(event.payload.paths[0]);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [handleDrop]);

  // ウィンドウ移動のリスナーを設定
  useEffect(() => {
    const unlistenResize = listen<{ width: number; height: number }>("tauri://resize", (event) => {
      windowResized(event.payload);
    });
    return () => {
      unlistenResize.then((f) => f());
    };
  }, [windowResized]);

  // ウィンドウリサイズのリスナーを設定
  useEffect(() => {
    const unlistenMove = listen<{ x: number; y: number }>("tauri://move", (event) => {
      windowMoved(event.payload);
    });
    return () => {
      unlistenMove.then((f) => f());
    };
  }, [windowMoved]);

  // ウィンドウの位置とサイズを保存するコールバックを設定
  useEffect(() => {
    // 終了時の `tauri://close-requested` では保存完了まで終了を待てないため、ウィンドウのフォーカスが外れたときに保存する
    const unlisten = listen("tauri://blur", () => {
      storeConfig();
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [storeConfig]);

  // キー押下のイベントリスナーを設定
  useEffect(() => {
    document.addEventListener("keydown", handleEvent);
    return () => {
      document.removeEventListener("keydown", handleEvent);
    };
  }, [handleEvent]);

  // マウスホイール操作のイベントリスナーを設定
  useEffect(() => {
    document.addEventListener("wheel", handleEvent);
    return () => {
      document.removeEventListener("wheel", handleEvent);
    };
  }, [handleEvent]);

  // マウスクリックのイベントリスナーを設定
  useEffect(() => {
    document.addEventListener("mousedown", handleEvent);
    return () => {
      document.removeEventListener("mousedown", handleEvent);
    };
  }, [handleEvent]);
}
