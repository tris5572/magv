import { convertFileSrc } from "@tauri-apps/api/core";

/*
 * 画像のサイズを取得する
 *
 * 画像のパスを指定すると、その画像のサイズを取得する
 */
export function getImageSize(
  path: string
): Promise<{ width: number; height: number } | undefined> {
  // 何もしない Promise を返す
  if (!path) {
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
    img.src = convertFileSrc(path);
  });
}

/*
 * 画像の向きを取得する
 *
 * - 縦向きの場合は "portrait"
 * - 横向きの場合は "landscape"
 * - 画像のサイズが取得できなかった場合は `undefined`
 */
export async function getImageOrientation(path: string) {
  const size = await getImageSize(path);
  if (!size) {
    return undefined;
  }

  return size.width < size.height ? "portrait" : "landscape";
}
