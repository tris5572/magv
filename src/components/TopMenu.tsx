import { useState, type CSSProperties } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  isSlideshowRunningAtom,
  pageDirectionAtom,
  singleOrDoubleAtom,
  slideshowIntervalAtom,
  viewingImageAtom,
} from "../atoms/app";
import { useHandleEvent, useSlideshow } from "../hooks/event";
import { AppEvent } from "../types/event";

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
          <SlideshowController />
        </div>
      )}
    </div>
  );
}

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
        variant={singleOrDouble === "single" ? "selected" : "unselected"}
      />
      <IconButton
        src="/page-view-2.svg"
        label="見開き"
        onClick={() => {
          setSingleOrDouble("double");
          handleEvent(AppEvent.UPDATE_PAGE);
        }}
        variant={singleOrDouble === "double" ? "selected" : "unselected"}
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
        variant={pageDirection === "left" ? "selected" : "unselected"}
      />
      <IconButton
        src="/page-direction-right.svg"
        label="左開き"
        onClick={() => {
          setPageDirection("right");
          handleEvent(AppEvent.UPDATE_PAGE);
        }}
        variant={pageDirection === "right" ? "selected" : "unselected"}
      />
    </div>
  );
}

/**
 * スライドショーのコントローラーのコンポーネント
 */
function SlideshowController() {
  const { start, stop } = useSlideshow();
  const isSlideshowRunning = useAtomValue(isSlideshowRunningAtom);
  const isImageViewing = !!useAtomValue(viewingImageAtom);
  const [interval, setInterval] = useAtom(slideshowIntervalAtom);

  return (
    <div style={{ ...SWITCHER_STYLE, gap: "0.2rem" }}>
      <IconButton
        src={isSlideshowRunning ? "/player-stop.svg" : "/player-play.svg"}
        label={isSlideshowRunning ? "再生停止" : "自動再生"}
        onClick={() => (isSlideshowRunning ? stop() : start())}
        variant={isImageViewing ? "normal" : "disabled"}
      />
      <div style={SLIDESHOW_INTERVAL_BOX_STYLE}>
        間隔(秒)
        <input
          type="number"
          value={interval / 1000}
          onChange={(e) => setInterval(Number(e.currentTarget.value) * 1000)}
          min={0.1}
          step={0.1}
          max={100000}
          style={SLIDESHOW_INTERVAL_INPUT_STYLE}
        />
      </div>
    </div>
  );
}

/** 切替ボタンのグループのスタイル */
const SWITCHER_STYLE: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
};

const SLIDESHOW_INTERVAL_INPUT_STYLE: CSSProperties = {
  fontSize: "1.4rem",
  width: "6rem",
};

const SLIDESHOW_INTERVAL_BOX_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  paddingLeft: "4px",
  fontSize: "1.2rem",
  textShadow: "0 0 6px white",
};

/**
 * アイコンが付いたボタンのコンポーネント
 */
function IconButton({
  src,
  label,
  variant = "normal",
  onClick,
}: {
  src: string;
  label?: string;
  /**
   * ボタンのバリエーション
   * - `normal`: 常時押下可能な普通のボタン
   * - `disabled`: 押下不能なボタン
   * - `selected`: 選択されている、色の枠が付いたボタン
   * - `unselected`: 選択されていない、薄いボタン
   */
  variant?: "normal" | "disabled" | "selected" | "unselected";
  onClick?: () => void;
  style?: CSSProperties;
}) {
  let buttonStyle: CSSProperties;
  if (variant === "selected") {
    buttonStyle = {
      backgroundColor: "hsl(0 0% 100% / 80%)",
      border: "3px solid hsl(180 80% 50% / 0.5)",
      cursor: "pointer",
    };
  } else if (variant === "unselected") {
    buttonStyle = {
      backgroundColor: "hsl(0 0% 100% / 30%)",
      border: "none",
      cursor: "pointer",
    };
  } else if (variant === "disabled") {
    buttonStyle = {
      backgroundColor: "hsl(0 0% 100% / 30%)",
      border: "none",
    };
  } else {
    buttonStyle = {
      backgroundColor: "hsl(0 0% 100% / 80%)",
      border: "none",
      cursor: "pointer",
    };
  }

  return (
    <button
      style={{ ...ICON_BUTTON_COMMON_STYLE, ...buttonStyle }}
      onClick={variant !== "disabled" ? onClick : undefined}
    >
      <div>
        <img src={src} />
      </div>
      {label && <div style={BUTTON_LABEL_STYLE}>{label}</div>}
    </button>
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
  fontSize: "1.2rem",
  whiteSpace: "nowrap",
  overflow: "hidden",
  letterSpacing: "-0.05rem",
  fontFeatureSettings: "palt",
};
