import { useAtom } from "jotai";
import {
  imageListAtom,
  moveIndexAtom,
  openingImageIndexAtom,
} from "../types/zip";
import { useCallback, useRef } from "react";

/**
 * 画像のページ位置を表示するインジケーターコンポーネント
 */
export function Indicator() {
  const [list] = useAtom(imageListAtom);
  const [index] = useAtom(openingImageIndexAtom);
  const [, moveIndex] = useAtom(moveIndexAtom);
  const elementRef = useRef<HTMLDivElement>(null);

  // TODO: 見開き方法を変えられるようになったときは変更に対応する
  const direction = "left";

  const last = list.length - 1;
  const width = last === 0 ? 0 : (index / last) * 100;
  const pageStr = last === -1 ? "- / -" : `${index} / ${last}`;

  /** 進捗バーのスタイル。Tailwind では動的スタイルを利用できないため、自前でスタイルを生成する */
  const barStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    height: "32px",
    background: "hsl(200 10% 30%)",
    width: `${width}%`,
    right: direction === "left" ? 0 : undefined,
    // left: direction === "right" ? 0 : undefined,
  };

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (elementRef.current) {
        const clickX = e.clientX;
        const width = elementRef.current.clientWidth;
        console.log("handleClick", clickX);

        // TODO: 開き方向を変えられるようになったときは処理を切り替え可能にする
        const ratio = 1 - clickX / width;
        const idx = Math.floor(ratio * list.length);

        moveIndex({ index: idx });
      }
      e.stopPropagation();
    },
    [list.length, moveIndex]
  );

  return (
    <div
      className="w-dvw bg-transparent h-8 cursor-pointer relative select-none"
      ref={elementRef}
      onClick={handleClick}
    >
      <div style={barStyle}></div>
      <div className="w-dvw h-8 absolute top-0 left-0 flex justify-center items-center text-zinc-200">
        {pageStr}
      </div>
    </div>
  );
}
