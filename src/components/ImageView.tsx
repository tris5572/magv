import { CSSProperties } from "react";
import { useAtomValue } from "jotai";
import {
  canMoveNextAtom,
  canMovePrevAtom,
  pageDirectionAtom,
  viewingImageAtom,
} from "../atoms/app";
import { SingleImageView } from "./SingleImageView";
import { Menu } from "@tauri-apps/api/menu";
import { useHandleEvent } from "../hooks/event";
import { AppEvent } from "../types/event";

/**
 * 画像を表示するコンポーネント
 */
export function ImageView() {
  const viewingImage = useAtomValue(viewingImageAtom);
  const pageDirection = useAtomValue(pageDirectionAtom);
  const contextMenu = useContextMenu();

  async function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    const menu = await contextMenu;
    menu.popup();
  }

  // 見開き表示
  if (viewingImage?.type === "double") {
    return (
      <div style={getDoubleStyle(pageDirection)} onContextMenu={handleContextMenu}>
        <SingleImageView source={viewingImage?.source1} isHalf justify="left" />
        <SingleImageView source={viewingImage?.source2} isHalf justify="right" />
      </div>
    );
  }
  // 画像なし
  if (!viewingImage?.source) {
    return (
      <div onContextMenu={handleContextMenu}>
        <EmptyMessage />
      </div>
    );
  }
  // 単体表示
  return (
    <div style={SINGLE_STYLE} onContextMenu={handleContextMenu}>
      <SingleImageView source={viewingImage?.source} />
    </div>
  );
}

/** 画像単体表示時のスタイル */
const SINGLE_STYLE: CSSProperties = {
  height: "calc(100dvh - 32px)",
  overflow: "hidden",
};

/**
 * 見開き表示時のスタイルを返す
 * @param pageDirection ページの開き方向
 */
function getDoubleStyle(pageDirection: "right" | "left"): CSSProperties {
  return {
    height: "calc(100dvh - 32px)",
    display: "flex",
    flexDirection: pageDirection === "left" ? "row-reverse" : "row",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  };
}

/** 空のメッセージのスタイル */
const PLACEHOLDER_STYLE: CSSProperties = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  userSelect: "none",
  "-webkit-user-select": "none",
  background: "var(--black-color)",
  color: "color-mix(in srgb, var(--white-color) 50%, transparent)",
  fontSize: "1.6rem",
};

/**
 * 画像を表示していない空のときにメッセージを表示するコンポーネント
 */
function EmptyMessage() {
  return (
    <div style={PLACEHOLDER_STYLE}>
      ファイルをドロップしてください
      <br />
      <br />
      画像をまとめた zip ファイル
      <br />
      画像ファイル
      <br />
      画像が入ったフォルダ
    </div>
  );
}

/**
 * コンテキストメニューを生成するカスタムフック
 */
function useContextMenu() {
  const handleEvent = useHandleEvent();
  const canMoveNext = useAtomValue(canMoveNextAtom);
  const canMovePrev = useAtomValue(canMovePrevAtom);

  // 有効/無効の切り替えに、前後ページの有無を反転して使用しているため、開いているかどうかも条件に含めている
  const menuPromise = Menu.new({
    items: [
      {
        text: "次のページ",
        action: () => handleEvent(AppEvent.MOVE_NEXT_PAGE),
        enabled: canMoveNext,
      },
      {
        text: "前のページ",
        action: () => handleEvent(AppEvent.MOVE_PREV_PAGE),
        enabled: canMovePrev,
      },
      {
        item: "Separator",
      },
      {
        text: "最後のページ",
        action: () => handleEvent(AppEvent.MOVE_LAST_PAGE),
        enabled: canMoveNext,
      },
      {
        text: "最初のページ",
        action: () => handleEvent(AppEvent.MOVE_FIRST_PAGE),
        enabled: canMovePrev,
      },
      {
        item: "Separator",
      },
      {
        item: "Fullscreen",
        text: "フルスクリーン",
      },
    ],
  });

  return menuPromise;
}
