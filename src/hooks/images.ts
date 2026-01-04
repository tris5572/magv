import { useAtomValue, useSetAtom } from "jotai";
import { imageListAtom, moveIndexAtom, openingImageIndexAtom } from "../atoms/source";

/**
 * 表示画像に関する情報を扱うカスタムフック
 */
export function useImageData() {
  const index = useAtomValue(openingImageIndexAtom);
  const list = useAtomValue(imageListAtom);
  const moveIndex = useSetAtom(moveIndexAtom);

  return { index, list, moveIndex };
}
