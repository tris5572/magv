import { AppEvent } from "./event";

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

/**
 * キーボード操作の設定の型
 */
export type KeyboardConfig = {
  /**
   * 操作されたキー
   *
   * KeyboardEvent の Key プロパティ
   *
   * @see https://developer.mozilla.org/ja/docs/Web/API/UI_Events/Keyboard_event_key_values
   */
  key: string;
  /**
   * Ctrl キーの押下フラグ
   */
  ctrl: boolean;
  /**
   * Meta キーの押下フラグ
   *
   * - Mac: ⌘ Command
   * - Windows: ⊞ Windows
   */
  meta: boolean;
  /**
   * Shift キーの押下フラグ
   */
  shift: boolean;
  /**
   * 操作時に実行するイベント
   */
  event: AppEvent;
};
