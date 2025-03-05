import { useAtom } from "jotai";
import { imageListAtom, openingImageIndexAtom } from "../types/zip";

/**
 * 画像のページ位置を表示するインジケーターコンポーネント
 */
export function Indicator() {
  const [list] = useAtom(imageListAtom);
  const [index] = useAtom(openingImageIndexAtom);

  // TODO: 見開き方法を変えられるようになったときは変更に対応する
  const direction = "left";

  const last = list.length - 1;
  const width = last === 0 ? 0 : (index / last) * 100;

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

  return (
    <div className="w-dvw bg-transparent h-8 cursor-pointer relative">
      <div style={barStyle}></div>
    </div>
  );
}
