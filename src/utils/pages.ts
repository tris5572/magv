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

/**
 * 最後のページへ移動するときの遷移先を計算する
 *
 * 最後の2枚が両方とも縦画像の場合、見開き表示する
 *
 * @returns 遷移可能なときはそのインデックス、遷移不能なときは undefined
 */
export async function moveLastPage(args: {
  dataSource: DataSource | undefined;
  singleOrDouble: "single" | "double";
  updateData: (indexes: number[]) => Promise<void>;
}): Promise<number | undefined> {
  if (!args.dataSource) {
    return undefined;
  }

  const images = args.dataSource.images;
  const lastIndex = images.length - 1; // 最後の画像のインデックス
  const beforeIndex = lastIndex - 1; // 最後から1つ前の画像のインデックス

  // 画像が0枚または1枚のみの場合は何もしない
  if (lastIndex <= 0 || beforeIndex < 0) {
    return undefined;
  }

  // 単体表示の場合は画像の縦横に関係なく、最後の画像へ移動
  if (args.singleOrDouble === "single") {
    return lastIndex;
  }

  await args.updateData([lastIndex, beforeIndex]);

  // 最後の2枚が両方とも縦なら見開き表示
  if (
    images[lastIndex].orientation === "portrait" &&
    images[beforeIndex].orientation === "portrait"
  ) {
    return beforeIndex;
  }

  // 見開き表示で最後の2枚が両方とも縦画像の場合、最後の2枚を表示するように移動
  return lastIndex;
}
