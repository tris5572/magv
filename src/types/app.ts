// =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =
// #region アプリの表示画面
// =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =

export const AppViewMode = {
  /** 画像表示画面 */
  Image: "Image",
  /** 設定画面 */
  Setting: "Setting",
} as const;

/**
 * アプリケーションがどの画面を表示するか
 */
export type AppViewMode = (typeof AppViewMode)[keyof typeof AppViewMode];
