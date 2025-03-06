import { atom } from "jotai";
import { ViewImageMode } from "../types/image";

/** 現在開いている画像ファイルのパス */
export const openImagePathAtom = atom<ViewImageMode | undefined>(undefined);
