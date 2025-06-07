import { useAtomValue, useSetAtom } from "jotai";
import { appModeAtom } from "../atoms/app";
import {
  openingImageIndexAtom as imageIndexAtom,
  imageListAtom,
  moveIndexAtom as imageMoveIndexAtom,
} from "../atoms/image";
import {
  imageListAtom as zipListAtom,
  openingImageIndexAtom as zipIndexAtom,
  moveIndexAtom as zipMoveIndexAtom,
} from "../atoms/zip";

/**
 * 表示画像に関する情報を扱うカスタムフック
 *
 * データ取得系は、表示モードに応じて切り替える
 */
export function useImageData() {
  const mode = useAtomValue(appModeAtom);
  const zipIndex = useAtomValue(zipIndexAtom);
  const zipList = useAtomValue(zipListAtom);
  const zipMove = useSetAtom(zipMoveIndexAtom);

  const imageIndex = useAtomValue(imageIndexAtom);
  const imageList = useAtomValue(imageListAtom);
  const imageMove = useSetAtom(imageMoveIndexAtom);

  const index = mode === "zip" ? zipIndex : imageIndex;
  const list = mode === "zip" ? zipList : imageList;
  const moveIndex = mode === "zip" ? zipMove : imageMove;

  return { index, list, moveIndex };
}
