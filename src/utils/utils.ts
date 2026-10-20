import { convertFileSrc } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { ImageOrientation } from "../types/image";

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 画像関連
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * 画像のサイズを取得する
 *
 * 指定可能な画像ソースは以下の種類
 * - ローカルのパス (string)
 * - 画像を Base64 エンコードしたもの (string)
 * - 画像の Blob
 */
export function getImageSize(
  source: string | Blob,
): Promise<{ width: number; height: number } | undefined> {
  // ソースが存在しなかった場合(彼文字列も該当)は、何もしない Promise を返す
  if (!source) {
    return new Promise((resolve) => {
      resolve(undefined);
    });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (error) => {
      reject(error);
    };
    const src =
      source instanceof Blob
        ? URL.createObjectURL(source) // Blob は URL を生成
        : source.startsWith("data:")
          ? source // Base64 はそのまま
          : convertFileSrc(source); // ローカルのパスは、表示用のパスに変換
    img.src = src;
  });
}

/**
 * 画像の向きを取得する
 *
 * - 縦向きの場合は "portrait"
 * - 横向きの場合は "landscape"
 * - 画像のサイズが取得できなかった場合は `undefined`
 */
export async function getImageOrientation(
  source: string | Blob,
): Promise<ImageOrientation | undefined> {
  const size = await getImageSize(source);
  if (!size) {
    return undefined;
  }

  return size.width < size.height ? "portrait" : "landscape";
}

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region その他
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * 指定されたキーワードをWeb検索してブラウザで開く
 *
 * 検索キーワードからはハイフンを取り除く
 */
export function searchAtBrowser(keyword: string) {
  const word = keyword.replace(/-/g, " ");

  if (word) {
    // const url = `https://www.google.com/search?q=${encodeURIComponent(word)}`;
    const url = `https://duckduckgo.com/?t=h_&q=${encodeURIComponent(word)}`;
    void openUrl(url);
  }
}
