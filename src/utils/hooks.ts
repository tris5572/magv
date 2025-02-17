import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

export type ImageSize = {
  width: number;
  height: number;
};

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
