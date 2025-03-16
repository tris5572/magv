import { useState } from "react";
import { useAtom } from "jotai";
import { singleOrDoubleAtom } from "../atoms/app";
import { useHandleEvent } from "../hooks/event";
import { AppEvent } from "../types/event";

/**
 * 画面上部に表示する挙動切替メニューのコンポーネント
 *
 * 上部端にマウスを当てることで表示される
 */
export function TopMenu() {
  const [isVisible, setIsVisible] = useState(false);

  const wrapperClass = isVisible
    ? "absolute top-0 left-0 w-dvw bg-white/30 backdrop-blur-sm text-neutral-700 p-2"
    : "absolute top-0 left-0 w-dvw bg-transparent h-8";

  return (
    <div
      className={wrapperClass}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {isVisible && (
        <div className="flex flex-row justify-center">
          <SingleDoubleSwitcher />
        </div>
      )}
    </div>
  );
}

/**
 * 見開き表示を切り替えるコンポーネント
 */
function SingleDoubleSwitcher() {
  const [singleOrDouble, setSingleOrDouble] = useAtom(singleOrDoubleAtom);
  const handleEvent = useHandleEvent();

  return (
    <div className="flex flex-row justify-center">
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
}) {
  const buttonClass = selected
    ? "bg-white/80 flex flex-col items-center justify-center rounded-md px-1 py-0.5 w-[3rem] inset-ring-3 inset-ring-blue-500/50"
    : "bg-white/30 flex flex-col items-center justify-center rounded-md px-1 py-0.5 w-[3rem] cursor-pointer";

  return (
    <button className={buttonClass} onClick={onClick}>
      <div>
        <img src={src} />
      </div>
      {label && <div className="text-xs">{label}</div>}
    </button>
  );
}
