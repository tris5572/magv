import { listen } from "@tauri-apps/api/event";
import { CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { type CSSProperties, useCallback, useEffect, useRef } from "react";
import {
  canMoveNextAtom,
  canMovePrevAtom,
  isCursorVisibleAtom,
  isOpeningRenameViewAtom,
  isOpenPageAtom,
  singleOrDoubleAtom,
} from "../atoms/app";
import { handleEventAtom } from "../atoms/event";
import { openFileAtom, recentSourcePathListAtom } from "../atoms/source";
import { AppEvent } from "../types/event";
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

/**
 * アプリのメニューを表示するカスタムフック
 */
function useAppMenu() {
  const handleEvent = useSetAtom(handleEventAtom);
  const canMoveNext = useAtomValue(canMoveNextAtom);
  const canMovePrev = useAtomValue(canMovePrevAtom);
  const isOpenPage = useAtomValue(isOpenPageAtom);
  const recentSourcePathList = useAtomValue(recentSourcePathListAtom);
  const openSource = useSetAtom(openFileAtom);
  const [singleOrDouble, setSingleOrDouble] = useAtom(singleOrDoubleAtom);

  const createMenu = async () => {
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
        await Submenu.new({
          text: "最近使った項目を開く",
          items:
            recentSourcePathList.length === 0
              ? [
                  await MenuItem.new({
                    text: "項目なし",
                    action: () => {},
                    enabled: false,
                  }),
                ]
              : await Promise.all(
                  recentSourcePathList.map((path) =>
                    MenuItem.new({
                      text: path,
                      action: async () => {
                        await openSource(path);
                      },
                    }),
                  ),
                ),
        }),
        separator,
        await MenuItem.new({
          text: "ウィンドウを閉じる",
          accelerator: "Command+W",
          action: () => {},
        }),
      ],
    });

    const edit = await Submenu.new({
      text: "編集",
      items: [
        await PredefinedMenuItem.new({
          text: "元に戻す",
          item: "Undo",
        }),
        await PredefinedMenuItem.new({
          text: "やり直し",
          item: "Redo",
        }),
        separator,
        await PredefinedMenuItem.new({
          text: "切り取り",
          item: "Cut",
        }),
        await PredefinedMenuItem.new({
          text: "コピー",
          item: "Copy",
        }),
        await PredefinedMenuItem.new({
          text: "貼り付け",
          item: "Paste",
        }),
        await PredefinedMenuItem.new({
          text: "すべて選択",
          item: "SelectAll",
        }),
      ],
    });

    const view = await Submenu.new({
      text: "表示",
      items: [
        await CheckMenuItem.new({
          text: "単体表示",
          checked: singleOrDouble === "single",
          enabled: isOpenPage,
          action: () => {
            setSingleOrDouble("single");
            handleEvent(AppEvent.UPDATE_PAGE); // 表示モード切替後は強制的に再描画
          },
        }),
        await CheckMenuItem.new({
          text: "見開き表示",
          checked: singleOrDouble === "double",
          enabled: isOpenPage,
          action: () => {
            setSingleOrDouble("double");
            handleEvent(AppEvent.UPDATE_PAGE); // 表示モード切替後は強制的に再描画
          },
        }),
      ],
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
      items: [app, file, edit, view, move, window],
    });

    await menu.setAsAppMenu();
  };

  void createMenu();
}
