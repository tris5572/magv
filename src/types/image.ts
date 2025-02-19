/**
 * 1枚の画像を表示する
 */
export type SingleViewImage = {
  type: "single";
  path: string;
};

/**
 * 2枚の画像を表示する
 */
export type DoubleViewImage = {
  type: "double";
  path1: string;
  path2: string;
};

/**
 * 画像の表示方法
 */
export type ViewImage = SingleViewImage | DoubleViewImage;
