import { atom } from "jotai";
import { ViewImageMode } from "../types/image";

/**
 * 表示する画像の情報を保持する atom
 *
 * 見開きかどうかと、表示している画像の情報を持つ
 *
 * この atom にデータをセットすることで、表示する画像が切り替わる
 */
export const viewingImageAtom = atom<ViewImageMode | undefined>(undefined);
