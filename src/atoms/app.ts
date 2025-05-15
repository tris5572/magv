import { atom } from "jotai";
import { ViewImageMode } from "../types/image";
import { AppViewMode } from "../types/app";
import {
  isFirstPageAtom as isZipFirstPageAtom,
  isLastPageAtom as isZipLastPageAtom,
  isOpenZipAtom,
} from "./zip";
import {
  isFirstPageAtom as isImageFirstPageAtom,
  isLastPageAtom as isImageLastPageAtom,
  isOpenImageAtom,
} from "./image";

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
アプリケーション全体の状態を管理する atom を集めたファイル
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/**
 * アプリケーションの表示画面を保持する atom
 *
 * この値に応じて表示する画面を切り替える
 */
export const appViewMode = atom<AppViewMode>(AppViewMode.Image);

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

/**
 * 見開き方向を切り替える atom
 *
 * デフォルトでは左に進む（右開き）で `"left"`
 */
export const pageDirectionAtom = atom<"right" | "left">("left");

// =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =
// #region 画像情報取得関連
// =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =

/**
 * 画像を表示しているかどうかを取得する atom
 */
export const isOpenPageAtom = atom((get) => {
  const mode = get(appModeAtom);
  return mode === "zip" ? get(isOpenZipAtom) : get(isOpenImageAtom);
});

/**
 * 最初のページを表示しているかどうかを取得する atom
 *
 * 画像を表示していないときは false を返す
 */
export const isFirstPageAtom = atom((get) => {
  const mode = get(appModeAtom);
  return mode === "zip" ? get(isZipFirstPageAtom) : get(isImageFirstPageAtom);
});

/**
 * 最後のページを表示しているかどうかを取得する atom
 *
 * 画像を表示していないときは false を返す
 */
export const isLastPageAtom = atom((get) => {
  const mode = get(appModeAtom);
  return mode === "zip" ? get(isZipLastPageAtom) : get(isImageLastPageAtom);
});

/**
 * 前のページへ移動可能かどうかを取得する atom
 */
export const canMovePrevAtom = atom((get) => {
  return get(isOpenPageAtom) && !get(isFirstPageAtom);
});

/**
 * 次のページへ移動可能かどうかを取得する atom
 */
export const canMoveNextAtom = atom((get) => {
  return get(isOpenPageAtom) && !get(isLastPageAtom);
});

// =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =
// #region スライドショー関連
// =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =

// スライドショーの制御について
//
// 開始 `start` はカスタムフック `useSlideshow` からのみ呼び出せる。
// これは次ページへ移動するイベントを実行するため。
// （`useHandleEvent` を経由してイベントを呼び出す必要があるため、atom からは呼び出せない）
//
// 停止 `stop` とリセット `reset` は、カスタムフック `useSlideshow` と atom の両方から呼び出し可能。
// atom 側から停止させたいケースが多く存在するため。（最終ページに到達したときなど）
// カスタムフック `useSlideshow` の実装は、この atom を呼び出すものとしている。

/**
 * スライドショーの累積カウント(ミリ秒)を保持する atom
 *
 * スライドショーを再生しているときはこのカウントを増やしていき、設定された閾値以上になったときに次ページ移動のイベントを発行する
 */
export const slideshowCountAtom = atom(0);

/**
 * スライドショーの切替間隔(ミリ秒)を保持する atom
 */
export const slideshowIntervalAtom = atom(1000);

/**
 * スライドショーの経過時間をカウントする setInterval の ID を保持する atom
 *
 * これが `undefined` のときはスライドショーが行われていないと判定可能だが、それは行わない
 */
export const slideshowIntervalIdAtom = atom<number | undefined>(undefined);

/**
 * スライドショーが実行中かどうかを返す atom
 *
 * 実行中は `true`、停止中は `false` を返す
 */
export const isSlideshowRunningAtom = atom((get) => {
  return get(slideshowIntervalIdAtom) !== undefined;
});

/**
 * スライドショーを停止する atom
 *
 * 停止のみを行い、累積カウントはリセットしない
 */
export const stopSlideshowAtom = atom(null, (get, set) => {
  const intervalId = get(slideshowIntervalIdAtom);
  if (intervalId !== undefined) {
    clearInterval(intervalId);
    set(slideshowIntervalIdAtom, undefined);
  }
});

/**
 * スライドショーの経過時間をリセットする atom
 */
export const resetSlideshowAtom = atom(null, (_, set) => {
  set(slideshowCountAtom, 0);
});
