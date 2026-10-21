import { listen } from "@tauri-apps/api/event";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { type CSSProperties, useCallback, useEffect, useRef } from "react";
import { isCursorVisibleAtom, isOpeningRenameViewAtom } from "../atoms/app";
import { handleEventAtom } from "../atoms/event";
import { openFileAtom } from "../atoms/source";
import { useAppMenu } from "../hooks/menu";
import { shouldShowCursorOnMouseMove } from "../utils/event";
import { ImageView } from "./ImageView";
import { Indicator } from "./Indicator";
import { Log } from "./Log";
import { RenameBox } from "./RenameBox";
import { TopMenu } from "./TopMenu";

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

  useEventListener();
  useCursorVisibilityController();
  useAppMenu();

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
 * カーソル表示を制御するカスタムフック
 */
function useCursorVisibilityController() {
  const [isCursorVisible, setIsCursorVisible] = useAtom(isCursorVisibleAtom);
  const isCursorVisibleRef = useRef(isCursorVisible);

  useEffect(() => {
    isCursorVisibleRef.current = isCursorVisible;
  }, [isCursorVisible]);

  // 非表示中のみ、マウス移動をトリガーにカーソルを再表示する
  useEffect(() => {
    const handleMouseMove = () => {
      if (shouldShowCursorOnMouseMove(isCursorVisibleRef.current)) {
        setIsCursorVisible(true);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [setIsCursorVisible]);

  // カーソルを表示/非表示する
  useEffect(() => {
    document.documentElement.classList.toggle("cursor-hidden", !isCursorVisible);
    // void getCurrentWindow().setCursorVisible(isCursorVisible); // なぜか効かないのでコメントアウト
  }, [isCursorVisible]);

  // 終了時は必ずカーソルを表示へ戻す
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("cursor-hidden");
      // void getCurrentWindow().setCursorVisible(true); // なぜか効かないのでコメントアウト
    };
  }, []);
}

/**
 * App コンポーネントのイベントリスナーを登録するカスタムフック
 */
function useEventListener() {
  const openSource = useSetAtom(openFileAtom);
  const handleEvent = useSetAtom(handleEventAtom);

  // ファイルがドロップされたときの処理
  const handleDrop = useCallback(
    async (path: string) => {
      await openSource(path);
    },
    [openSource],
  );

  // ファイルをドロップしたときのリスナーを設定
  useEffect(() => {
    const unlisten = listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
      void handleDrop(event.payload.paths[0]);
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, [handleDrop]);

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
