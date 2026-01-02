import type { ImageOrientation } from "./image";

/**
 * 解凍したアーカイブのデータ
 */
export type ZipData = {
  /**
   * キーは画像ファイル名
   */
  [name: string]: {
    /**
     * Blob に変換した画像データ
     */
    blob: Blob;
    /**
     * 画像の向き
     *
     * 向きを未取得または取得できなかった場合は `undefined`
     */
    orientation?: ImageOrientation;
  };
};

/**
 * 1つの画像のデータ
 */
export type ImageData = {
  /**
   * 画像ファイル名
   */
  name: string;
  /**
   * 表示する画像のソース
   *
   * - 画像を Blob に変換したデータ
   * - 画像のパス
   *
   * 表示処理の中で自動判定するため、まとめて保持可能
   */
  source: Blob | string;
  /**
   * 画像の向き
   *
   * 向きを未取得の状態、または取得できなかった場合は `undefined`
   *
   * （画像サイズ取得のためには非同期関数を実行する必要があるため、初期状態では未確定）
   */
  orientation: ImageOrientation | undefined;
};

/**
 * 表示するデータのソース。アーカイブファイルとディレクトリを同様に扱う。
 */
export type DataSource = {
  /**
   * 画像データのリスト
   */
  images: ImageData[];
  /**
   * 開いているソースと兄弟階層にあるパスのリスト
   *
   * - アーカイブ: 同一フォルダ内に存在するアーカイブファイルのリスト
   * - ディレクトリ・画像: 同一階層のディレクトリのリスト
   */
  siblings: string[];
};

/**
 * 各データソース（パス）に対して保持する、最後に開いたインデックス
 */
export type LastIndex = {
  path: string;
  index: number;
};
