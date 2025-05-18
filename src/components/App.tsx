import { CSSProperties, useCallback, useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import { Log } from "./Log";
import { openZipAtom } from "../atoms/zip";
import { useRestoreWindowConfig, useStoreWindowConfig, useWindowEvent } from "../hooks/config";
import { ImageView } from "./ImageView";
import { Indicator } from "./Indicator";
import { useHandleEvent } from "../hooks/event";
import { RenameBox } from "./RenameBox";
import { canMoveNextAtom, canMovePrevAtom, isOpeningRenameViewAtom } from "../atoms/app";
import { TopMenu } from "./TopMenu";
import { getPathKind } from "../utils/files";
import { openImagePathAtom } from "../atoms/image";
import { AppEvent } from "../types/event";

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

/**
 * アプリのメニューを表示するカスタムフック
 */
function useAppMenu() {
  const handleEvent = useHandleEvent();
  const canMoveNext = useAtomValue(canMoveNextAtom);
  const canMovePrev = useAtomValue(canMovePrevAtom);

  (async function () {
    const separator = await PredefinedMenuItem.new({
      text: "-",
      item: "Separator",
    });

    // macOS では最初の1つがアプリ名のメニューになる
    const app = await Submenu.new({
      text: "magv",
      items: [
        await MenuItem.new({
          text: "magv について",
          action: () => {},
          enabled: false,
        }),
        separator,
        await MenuItem.new({
          text: "設定",
          action: () => {},
          enabled: false,
        }),
        separator,
        await PredefinedMenuItem.new({
          text: "magv を非表示",
          item: "Hide",
        }),
        await PredefinedMenuItem.new({
          text: "ほかを非表示",
          item: "HideOthers",
        }),
        await PredefinedMenuItem.new({
          text: "すべてを表示",
          item: "ShowAll",
        }),
        separator,
        await PredefinedMenuItem.new({
          text: "magv を終了",
          item: "Quit",
        }),
      ],
    });

    const file = await Submenu.new({
      text: "ファイル",
      items: [
        await MenuItem.new({
          text: "ファイルを開く",
          accelerator: "Command+o",
          action: () => {},
          enabled: false,
        }),
        separator,
        await MenuItem.new({
          text: "ウィンドウを閉じる",
          accelerator: "Command+W",
          action: () => {},
        }),
      ],
    });

    const view = await Submenu.new({
      text: "表示",
      items: [],
    });

    const move = await Submenu.new({
      text: "移動",
      items: [
        await MenuItem.new({
          text: "次のページ",
          action: () => {
            handleEvent(AppEvent.MOVE_NEXT_PAGE);
          },
          enabled: canMoveNext,
        }),
        await MenuItem.new({
          text: "前のページ",
          action: () => {
            handleEvent(AppEvent.MOVE_PREV_PAGE);
          },
          enabled: canMovePrev,
        }),
        separator,
        await MenuItem.new({
          text: "1枚次へ",
          action: () => {
            handleEvent(AppEvent.MOVE_NEXT_SINGLE_IMAGE);
          },
          enabled: canMoveNext,
        }),
        await MenuItem.new({
          text: "1枚前へ",
          action: () => {
            handleEvent(AppEvent.MOVE_PREV_SINGLE_IMAGE);
          },
          enabled: canMovePrev,
        }),
        separator,
        await MenuItem.new({
          text: "最後のページ",
          action: () => {
            handleEvent(AppEvent.MOVE_LAST_PAGE);
          },
          enabled: canMoveNext,
        }),
        await MenuItem.new({
          text: "最初のページ",
          action: () => {
            handleEvent(AppEvent.MOVE_FIRST_PAGE);
          },
          enabled: canMovePrev,
        }),
      ],
    });

    const window = await Submenu.new({
      text: "ウィンドウ",
      items: [
        await PredefinedMenuItem.new({
          text: "フルスクリーン",
          item: "Fullscreen",
        }),
        separator,
        await PredefinedMenuItem.new({
          text: "拡大/縮小",
          item: "Maximize",
        }),
        await PredefinedMenuItem.new({
          text: "最小化",
          item: "Minimize",
        }),
      ],
    });

    const menu = await Menu.new({
      items: [app, file, view, move, window],
    });

    await menu.setAsAppMenu();
  })();
}
