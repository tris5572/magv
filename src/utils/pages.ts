import type { DataSource } from "../types/data";
import type { ViewImageMode } from "../types/image";

/**
 * 1枚だけ次の画像へ移動するときの遷移先を計算する
 *
 * @returns 遷移可能なときはそのインデックス、遷移不能なときは undefined
 */
export function moveNextSingleImage(args: {
  /** 現在開いているインデックス */
  index: number;
  dataSource: DataSource | undefined;
  imageProperty: ViewImageMode | undefined;
}): number | undefined {
  if (!args.dataSource || !args.imageProperty) {
    return undefined;
  }

  // 最後の画像を表示しているときは何もしない
  if (args.dataSource.images.length - 1 <= args.index) {
    return;
  }

  // 最後のページとして2枚表示されている場合は移動せず見開きのままとする
  if (args.imageProperty.type === "double" && args.dataSource.images.length - 2 <= args.index) {
    return;
  }

  return args.index + 1;
}

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
