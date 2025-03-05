type Props = {
  /**
   * 現在開いているページのインデックス
   */
  index: number;
  /**
   * 最後のページのインデックス
   */
  last: number;
  /**
   * インジケーターの方向
   *
   * - "left": 左に進む（右開き） default
   * - "right": 右に進む（左開き）
   */
  direction?: "left" | "right";
};

/**
 * 画像のページ位置を表示するインジケーターコンポーネント
 */
export function Indicator({ index, last, direction = "left" }: Props) {
  const percent = last === 0 ? 0 : (index / last) * 100;
  const rl = direction === "left" ? "right" : "left";

  return (
    <div className="w-dvw bg-transparent h-8 cursor-pointer relative">
      {/* <div
        className={`absolute top-0 ${rl}-0 bg-amber-700 w-[${percent}%] h-8`}
      ></div> */}
    </div>
  );
}
