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
  return <div className="w-dvw bg-amber-700 h-8"></div>;
}
