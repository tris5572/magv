import { useState, type CSSProperties } from "react";
import { useAtom } from "jotai";
import { pageDirectionAtom, singleOrDoubleAtom } from "../atoms/app";
import { useHandleEvent } from "../hooks/event";
import { AppEvent } from "../types/event";

/** 上部メニューに常に割り当てるスタイル */
const MENU_WRAPPER_STYLE: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100dvw",
  color: "hsl(180 10% 20%)",
};

/** 上部メニューの中身を並べるスタイル */
const MENU_BODY_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  gap: "8px",
};

/**
 * 画面上部に表示する挙動切替メニューのコンポーネント
 *
 * 上部端にマウスを当てることで表示される
 */
export function TopMenu() {
  const [isVisible, setIsVisible] = useState(false);

  // 表示/非表示状態に応じてスタイルを切替
  const visibleStyle: CSSProperties = isVisible
    ? {
        backgroundColor: "hsl(0 0% 100% / 30%)",
        backdropFilter: "blur(8px)",
        padding: "0.5rem",
      }
    : {
        backgroundColor: "transparent",
        height: "3rem",
      };

  return (
    <div
      style={{ ...MENU_WRAPPER_STYLE, ...visibleStyle }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {isVisible && (
        <div style={MENU_BODY_STYLE}>
          <SingleDoubleSwitcher />
          <PageDirectionSwitcher />
        </div>
      )}
    </div>
  );
}

/** 切替ボタンのグループのスタイル */
const SWITCHER_STYLE: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
};

/**
 * 見開き表示を切り替えるコンポーネント
 */
function SingleDoubleSwitcher() {
  const [singleOrDouble, setSingleOrDouble] = useAtom(singleOrDoubleAtom);
  const handleEvent = useHandleEvent();

  return (
    <div style={SWITCHER_STYLE}>
      <IconButton
        src="/page-view-1.svg"
        label="単体"
        onClick={() => {
          setSingleOrDouble("single");
          handleEvent(AppEvent.UPDATE_PAGE);
        }}
        selected={singleOrDouble === "single"}
      />
      <IconButton
        src="/page-view-2.svg"
        label="見開き"
        onClick={() => {
          setSingleOrDouble("double");
          handleEvent(AppEvent.UPDATE_PAGE);
        }}
        selected={singleOrDouble === "double"}
      />
    </div>
  );
}

/**
 * ページの方向を切り替えるコンポーネント
 */
function PageDirectionSwitcher() {
  const [pageDirection, setPageDirection] = useAtom(pageDirectionAtom);
  const handleEvent = useHandleEvent();

  return (
    <div style={SWITCHER_STYLE}>
      <IconButton
        src="/page-direction-left.svg"
        label="右開き"
        onClick={() => {
          setPageDirection("left");
          handleEvent(AppEvent.UPDATE_PAGE);
        }}
        selected={pageDirection === "left"}
      />
      <IconButton
        src="/page-direction-right.svg"
        label="左開き"
        onClick={() => {
          setPageDirection("right");
          handleEvent(AppEvent.UPDATE_PAGE);
        }}
        selected={pageDirection === "right"}
      />
    </div>
  );
}

const ICON_BUTTON_COMMON_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
  padding: "2px 0 1px",
  width: "5rem",
};

const BUTTON_LABEL_STYLE: CSSProperties = {
  fontSize: "12px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  letterSpacing: "-0.05rem",
  fontFeatureSettings: "palt",
};

/**
 * アイコンが付いたボタンのコンポーネント
 */
function IconButton({
  src,
  label,
  selected = false,
  onClick,
}: {
  src: string;
  label?: string;
  selected?: boolean;
  onClick: () => void;
  style?: CSSProperties;
}) {
  const buttonStyle: CSSProperties = selected
    ? {
        backgroundColor: "hsl(0 0% 100% / 80%)",
        border: "3px solid hsl(180 80% 50% / 0.5)",
      }
    : {
        backgroundColor: "hsl(0 0% 100% / 30%)",
        cursor: "pointer",
        border: "none",
      };

  return (
    <button style={{ ...ICON_BUTTON_COMMON_STYLE, ...buttonStyle }} onClick={onClick}>
      <div>
        <img src={src} />
      </div>
      {label && <div style={BUTTON_LABEL_STYLE}>{label}</div>}
    </button>
  );
}
