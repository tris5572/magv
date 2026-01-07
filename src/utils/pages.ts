import type { DataSource } from "../types/data";

/**
 * 1枚だけ前の画像へ移動するときの遷移先を計算する
 *
 * 見開き状態等に関係なく、インデックスを1つだけ前に移動する
 *
 * @returns 遷移可能なときはそのインデックス、遷移不能なときは undefined
 */
export function movePrevSingleImage(args: {
  /** 現在開いているインデックス */
  index: number;
  dataSource: DataSource | undefined;
}): number | undefined {
  if (!args.dataSource) {
    return undefined;
  }

  const idx = args.index - 1;

  if (idx < 0) {
    return undefined;
  }

  return idx;
}
