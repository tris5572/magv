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
    orientation?: "portrait" | "landscape";
  };
};
