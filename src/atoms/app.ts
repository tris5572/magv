import { atom } from "jotai";
import { ViewImageMode } from "../types/image";

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
アプリケーション全体の状態を管理する atom を集めたファイル
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/**
 * アプリの動作モードを保持する atom
 *
 * 主にイベントをどの atom に対して発行するかを制御する
 */
export const appModeAtom = atom<"zip" | "image">("zip");

/**
 * 表示する画像の情報を保持する atom
 *
 * 見開きかどうかと、表示している画像の情報を持つ
 *
 * この atom にデータをセットすることで、表示する画像が切り替わる
 */
export const viewingImageAtom = atom<ViewImageMode | undefined>(undefined);

/**
 * リネーム入力欄を開いているかどうかの atom
 */
export const isOpeningRenameViewAtom = atom<boolean>(false);

/**
 * 画像を単体表示にするか見開き表示にするかを切り替える atom
 *
 * - "single": 常に1枚のみ表示
 * - "double": 見開き表示可能な場合(縦画像が2枚連続)は見開き表示
 */
export const singleOrDoubleAtom = atom<"single" | "double">("double");

/**
 * ルーペ機能のオンオフを切り替える atom
 */
export const isMagnifierEnabledAtom = atom<boolean>(false);
