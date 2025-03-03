/**
 * 設定ファイルのファイル名
 */
export const CONFIG_FILE_NAME = "config.json";

/**
 * 設定ファイルの型
 */
export type Config = {
  window?: {
    position?: {
      x: number;
      y: number;
    };
    size?: {
      width: number;
      height: number;
    };
  };
};
