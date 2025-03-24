import { useCallback, useEffect, useRef, useState } from "react";
import { useImageData } from "../hooks/images";

/**
 * 画像のページ位置を表示するインジケーターコンポーネント
 */
export function Indicator() {
  const imageData = useImageData();
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const index = imageData.index;
  const list = imageData.list;
  const moveIndex = imageData.moveIndex;

  // TODO: 見開き方法を変えられるようになったときは変更に対応する
  const direction = "left";

  const last = list.length;
  const width = last === 0 ? 0 : (index / (last - 1)) * 100;
  const pageStr = last === 0 ? "- / -" : `${index + 1} / ${last}`;

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

  /** クリックまたはドラッグによるページ移動処理のために呼び出されるコールバック */
  const handleMoveEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
      if (elementRef.current) {
        const clickX = e.clientX;
        const width = elementRef.current.clientWidth;

        // TODO: 開き方向を変えられるようになったときは処理を切り替え可能にする
        const ratio = 1 - clickX / width;
        const idx = Math.floor(ratio * list.length);

        moveIndex({ index: idx });
      }
    },
    [list.length, moveIndex]
  );

  /** クリック時に呼び出されるコールバック */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
      // 左クリックのときだけ移動処理を実行する
      if (e.button === 0) {
        handleMoveEvent(e);
        setIsDragging(true);
      }
    },
    [handleMoveEvent]
  );

  /** ドラッグ中に呼び出されるコールバック */
  const handleDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
      if (isDragging) {
        handleMoveEvent(e);
      }
    },
    [isDragging, handleMoveEvent]
  );

  // 要素の外（ウィンドウ内）でドラッグされたときにページを移動するためのリスナーを追加
  useEffect(() => {
    document.addEventListener("mousemove", handleDrag);
    return () => {
      document.removeEventListener("mousemove", handleDrag);
    };
  }, [handleDrag]);

  // 要素の外（ウィンドウ内）でマウスアップされたときにドラッグを解除するためのリスナーを追加
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      className="w-dvw bg-transparent h-8 cursor-pointer relative select-none"
      ref={elementRef}
      onMouseDown={handleClick}
      onMouseMove={handleDrag}
      onMouseUp={() => {
        setIsDragging(false);
      }}
    >
      <div style={barStyle}></div>
      <div className="w-dvw h-8 absolute top-0 left-0 flex justify-center items-center text-zinc-200">
        {pageStr}
      </div>
    </div>
  );
}
