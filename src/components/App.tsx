import { CSSProperties, useCallback, useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import { Log } from "./Log";
import { openZipAtom } from "../atoms/zip";
import { useRestoreWindowConfig, useStoreWindowConfig, useWindowEvent } from "../hooks/config";
import { ImageView } from "./ImageView";
import { Indicator } from "./Indicator";
import { useHandleEvent } from "../hooks/event";
import { RenameBox } from "./RenameBox";
import { isOpeningRenameViewAtom } from "../atoms/app";
import { TopMenu } from "./TopMenu";
import { getPathKind } from "../utils/files";
import { openImagePathAtom } from "../atoms/image";

const APP_STYLE: CSSProperties = {
  height: "100dvh",
  width: "100dvw",
  display: "grid",
  gridTemplateRows: "1fr 32px",
};

/**
 * アプリのメインコンポーネント
 */
export function App() {
  const isOpeningRenameView = useAtomValue(isOpeningRenameViewAtom);

  useRestoreWindowConfig();
  useEventListener();

  return (
    <main style={APP_STYLE}>
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
  const openZip = useSetAtom(openZipAtom);
  const openImage = useSetAtom(openImagePathAtom);
  const { windowResized, windowMoved } = useWindowEvent();
  const storeConfig = useStoreWindowConfig();
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
        openImage(path);
      }
    },
    [openImage, openZip]
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
