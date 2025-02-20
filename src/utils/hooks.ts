import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ImageSize } from "../types/image";

/**
 * 画像のサイズを取得するカスタムフック
 *
 * 取得できなかった場合は undefined を返す
 */
export const useImageSize = (path: string): ImageSize | undefined => {
  const [size, setSize] = useState<ImageSize>({ width: 0, height: 0 });

  useEffect(() => {
    if (!path) {
      return;
    }
    const image = new Image();
    image.src = convertFileSrc(path);
    image.onload = () => {
      const { naturalHeight, naturalWidth } = image;
      setSize({ width: naturalWidth, height: naturalHeight });
    };
  }, [path]);

  // サイズを取得できなかった場合は undefined を返す
  if (size.width === 0 || size.height === 0) {
    return undefined;
  }

  return size;
};

/**
 * 画像の向きを取得するカスタムフック
 *
 * - 縦向きの場合は "portrait"
 * - 横向きの場合は "landscape"
 * - 画像のサイズが取得できなかった場合は `undefined`
 */
export const useImageOrientation = (
  path: string
): "portrait" | "landscape" | undefined => {
  const size = useImageSize(path);
  // console.log(path, size);

  if (!size) {
    return undefined;
  }

  return size.width < size.height ? "portrait" : "landscape";
};
