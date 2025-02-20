/**
 * 1枚の画像を表示する
 */
export type SingleImageMode = {
  type: "single";
  path: string;
};

/**
 * 2枚の画像を表示する
 */
export type DoubleImageMode = {
  type: "double";
  path1: string;
  path2: string;
};

/**
 * 画像の表示方法
 */
export type ViewImageMode = SingleImageMode | DoubleImageMode;

/**
 * 画像のサイズ
 */
export type ImageSize = {
  width: number;
  height: number;
};
