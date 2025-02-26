import { convertFileSrc } from "@tauri-apps/api/core";

/**
 * 画像のサイズを取得する
 *
 * 指定可能な画像ソースは以下のもの
 *
 * - ローカルのパス (string)
 * - 画像の Base64 エンコード (string)
 * - 画像の Blob
 */
export function getImageSize(
  source: string | Blob
): Promise<{ width: number; height: number } | undefined> {
  // 何もしない Promise を返す
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
export async function getImageOrientation(source: string | Blob) {
  const size = await getImageSize(source);
  if (!size) {
    return undefined;
  }

  return size.width < size.height ? "portrait" : "landscape";
}
