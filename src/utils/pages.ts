import type { DataSource } from "../types/data";
import type { ViewImageMode } from "../types/image";

/**
 * 前のページへ移動するときの遷移先を計算する
 *
 * - 前のページに相当する画像の縦横を元に、表示する枚数を判定する
 * - 現在表示している画像は重複して表示しない。したがって移動後に縦画像が1枚だけ表示されるケースもあり得る
 *
 * 左開きの場合、以下のような表示となる（P:縦、L:横）
 *
 * - ...PP[P] → ...[PP]P
 * - ...LP[P] → ...L[P]P （同じ画像は繰り返し表示しない）
 * - ...PL[P] → ...P[L]P
 * - ...PP[L] → ...[PP]L
 * - ...LP[L] → ...L[P]L
 * - ...L[L] → ...[L]L
 * - P[P] → [P]P （最初の2枚が縦でも見開き表示しない）
 * - L[P] → [L]P
 * - P[L] → [P]L
 * - L[L] → [L]L
 *
 * @returns 遷移可能なときはそのインデックス、遷移不能なときは undefined
 */
export async function movePrevPage(args: {
  /** 現在開いているインデックス */
  index: number;
  dataSource: DataSource | undefined;
  updateData: (indexes: (number | undefined)[]) => Promise<void>;
}): Promise<{ index: number; forceSingle?: boolean } | undefined> {
  if (!args.dataSource) {
    return undefined;
  }

  const index1 = 1 <= args.index ? args.index - 1 : undefined; // 1枚手前のインデックス
  const index2 = 2 <= args.index ? args.index - 2 : undefined; // 2枚手前のインデックス

  // 前ページが存在しない場合は何もしない
  if (index1 === undefined) {
    return undefined;
  }

  await args.updateData([index1, index2]);

  // -1枚目が横のとき、-1枚目が最初の画像のとき(-2枚目がなかったとき)、-2枚目が横だったときは、1枚だけ戻って-1枚目のみを表示する
  if (
    args.dataSource.images[index1].orientation === "landscape" ||
    index2 === undefined ||
    args.dataSource.images[index2].orientation === "landscape"
  ) {
    return { index: index1, forceSingle: true }; // 1枚だけ戻った結果として縦画像が連続しても見開き表示とならないよう、1枚表示を強制
  }

  // -1枚目と-2枚目が両方とも縦長のときは、見開き表示する
  return { index: index2 };
}

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
