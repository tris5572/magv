import { useAtomValue } from "jotai";
import { imageListAtom as zipListAtom, openingImageIndexAtom as zipIndexAtom } from "../atoms/zip";
import { appModeAtom } from "../atoms/app";
import { openingImageIndexAtom as imageIndexAtom, imageListAtom } from "../atoms/image";

/**
 * 表示画像に関する情報を扱うカスタムフック
 *
 * データ取得系は、表示モードに応じて切り替える
 */
export function useImageData() {
  const mode = useAtomValue(appModeAtom);
  const zipIndex = useAtomValue(zipIndexAtom);
  const zipList = useAtomValue(zipListAtom);

  const imageIndex = useAtomValue(imageIndexAtom);
  const imageList = useAtomValue(imageListAtom);

  const index = mode === "zip" ? zipIndex : imageIndex;
  const list = mode === "zip" ? zipList : imageList;

  return { index, list };
}
