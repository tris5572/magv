/**
 * 1枚の画像を表示する
 */
export type SingleImageMode = {
  type: "single";
  source: string | Blob;
};

/**
 * 2枚の画像を表示する
 */
export type DoubleImageMode = {
  type: "double";
  source1: string | Blob;
  source2: string | Blob;
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

/**
 * 画像の向き
 *
 * - "portrait": 縦向き
 * - "landscape": 横向き
 */
export type ImageOrientation = "portrait" | "landscape";
