import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as fflate from "fflate";
import { atom } from "jotai";
import type { DataSource, LastIndex } from "../types/data";
import { dirFromPath, getFileList, getPathKind } from "../utils/files";
import { getImageOrientation } from "../utils/utils";
import {
  appModeAtom,
  isOpeningRenameViewAtom,
  resetSlideshowAtom,
  singleOrDoubleAtom,
  stopSlideshowAtom,
  viewingImageAtom,
} from "./app";

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 内部データ保持 atom
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * 開いているデータソースを保持する atom
 *
 * export for testing
 */
export const $openingSourceAtom = atom<DataSource | undefined>(undefined);

/**
 * アーカイブ内のファイル名のリストを保持する atom
 *
 * export for testing
 */
export const $imageNameListAtom = atom<string[]>([]);

/**
 * 表示している画像ファイルのインデックスを保持する atom
 *
 * 見開き(2枚)表示時は、若い方のインデックス
 *
 * export for testing
 */
export const $openingImageIndexAtom = atom<number>(0);

/**
 * 現在開いているデータソースのパスを保持する atom
 *
 * 何も開いていない初期状態では `undefined`
 */
const $openingSourcePathAtom = atom<string | undefined>();

/**
 * 「前」のデータソースのパスを保持する atom
 *
 * 「前」が存在しないときは `undefined`
 */
const $prevSourcePathAtom = atom<string | undefined>();

/**
 * 「次」のデータソースのパスを保持する atom
 *
 * 「次」が存在しないときは `undefined`
 */
const $nextSourcePathAtom = atom<string | undefined>();

/**
 * 対象フォルダ内にあるデータソースのリストを保持する atom
 */
const $sourcePathListAtom = atom<string[]>([]);

/**
 * 各データソースで最後に開いた画像のインデックスを保持する atom
 */
const $lastIndexArrayAtom = atom<LastIndex[]>([]);

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 外部公開 atom
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * アーカイブファイル(zip) またはフォルダを開く atom
 *
 * - zip ファイルの場合、渡されたパス(ローカル)のファイルを解凍し、画像ファイルのデータ (Blob) を取得する
 * - フォルダ/画像の場合、当該フォルダをそのまま開く
 *
 * 過去に開いた履歴があれば最後に開いていたページを、そうでなければ最初のページを表示する
 */
export const openFileAtom = atom(null, async (get, set, path: string | undefined) => {
  // パスがない場合は何もしない
  if (!path) {
    return;
  }

  const kind = await getPathKind(path);

  if (kind === "zip") {
    const response = await fetch(convertFileSrc(path));
    const arrayBuffer = await response.arrayBuffer();
    const unzipped = fflate.unzipSync(new Uint8Array(arrayBuffer));
    // zip ファイルの中身から不要なファイルを除外して画像ファイルだけに絞り込む
    const fileNames = Object.keys(unzipped)
      .filter((name) => !name.startsWith("__MACOSX/")) // Mac のリソースファイルを除く
      .filter((name) => !name.endsWith("/")) // ディレクトリを除く
      .filter((name) => /\.(jpe?g|png|gif|bmp|webp)$/i.test(name)) // 画像ファイルの拡張子を持つファイルだけを対象にする
      .sort((a, b) => a.localeCompare(b, [], { numeric: true })); // Finder と同じ並び順にするため、ロケールを考慮してソート

    // 生データを保持データへ変換
    const images = [];
    for (const name of fileNames) {
      const blob = new Blob([unzipped[name] as Uint8Array<ArrayBuffer>]); // 型エラーを一時的に解消するために型アサーション。TS 5.9 での型の変更に伴うもので、fflate の定義が変更されれば不要になる
      images.push({ name, source: blob, orientation: undefined });
    }
    const fileList = await getFileList(path, "zip"); // 開くアーカイブと同じ階層にあるファイルのリスト
    const source = { images, siblings: fileList };

    set($imageNameListAtom, fileNames);
    set($openingSourceAtom, source); // 初期化したデータを保持
    set(appModeAtom, "zip");
  } else {
    // フォルダまたは画像を開く場合
    const fileList = await getFileList(path, "image"); // 画像ファイルの一覧を取得

    if (fileList.length === 0) {
      return; // ディレクトリ内に画像ファイルがない場合は何もしない
    }

    // 画像ファイル一覧を保持データへ変換
    const images = [];
    for (const name of fileList) {
      images.push({ name, source: name, orientation: undefined });
    }
    const source = { images, siblings: fileList };

    set($openingSourceAtom, source); // 初期化したデータを保持
    set(appModeAtom, "image");

    // パスで指定された画像ファイルの有無により表示画像を変える
    const index = fileList.findIndex((file) => file === path);
    const dirPath = await dirFromPath(path);
    if (dirPath === path || index === -1) {
      set(moveIndexAtom, { index: 0 });
    } else {
      set(moveIndexAtom, { index });
    }
  }

  set(updateOpeningSourcePathAtom, path); // 保持するデータソースのパスとウィンドウのタイトルを更新
  getCurrentWindow().setFocus(); // ウィンドウを前面に出す
  set(stopSlideshowAtom); // スライドショーを停止する

  // 前後のアーカイブファイルのパスを更新して保持する
  //   const archiveList = get($archivePathListAtom);
  //   const archiveIndex = archiveList.findIndex((p) => p === path); // 現在のアーカイブのインデックスを探す
  //   if (archiveIndex !== -1) {
  //     // 現在のアーカイブが見付かったときのみ保持する（基本的に見付かるはず）
  //     // 前後のファイルが存在しないときは、自動的に undefined が入るので気にしない
  //     const prevPath = archiveList[archiveIndex - 1];
  //     const nextPath = archiveList[archiveIndex + 1];
  //     set($prevArchivePathAtom, prevPath);
  //     set($nextArchivePathAtom, nextPath);
  //   }

  // リネームビューを閉じる
  // リネームビューを開いている状態で、テキストフィールドからフォーカスを外してアーカイブ移動（カーソル上下）したとき、
  // テキストフィールドの内容と実際のファイルとの紐付けがゴチャゴチャになるので、一旦閉じる
  set(isOpeningRenameViewAtom, false);

  // 当該アーカイブを最後に開いていたときのインデックスを取得
  // 初めて開く場合は 0
  const index = get(lastOpenIndexAtom);

  // ページを表示
  set(moveIndexAtom, { index });
});

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region ページ移動系
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * 指定したインデックスのページへ移動する atom
 */
export const moveIndexAtom = atom(
  null,
  async (
    get,
    set,
    {
      index,
      forceSingle = false,
    }: {
      /** 開くインデックス */
      index: number;
      /** 強制的に1枚表示にするかどうかのフラグ */
      forceSingle?: boolean;
    }
  ) => {
    // const imageList = get($imageNameListAtom);
    const dataSource = get($openingSourceAtom);
    const singleOrDouble = get(singleOrDoubleAtom);

    if (!dataSource) {
      return;
    }

    const index1 = index < dataSource.images.length ? index : undefined;
    const index2 = index < dataSource.images.length - 1 ? index + 1 : undefined;

    if (index1 === undefined) {
      return; // 指定されたインデックスのファイルが存在しないときは何もしない
    }
    set(resetSlideshowAtom); // ページ移動したため、スライドショーの経過時間をリセット。手動と自動(スライドショー)の区別なくリセットしても問題ない
    set($openingImageIndexAtom, index1); // 最後に開いたページを保持

    // このアーカイブで最後に開いたインデックスを記録
    const archivePath = get($openingSourcePathAtom);
    if (archivePath) {
      set(lastOpenIndexAtom, archivePath, index1);
    }

    // 強制的に1枚のみを表示する場合
    if (forceSingle || singleOrDouble === "single" || index2 === undefined) {
      await set(updateImageDataAtom, [index1]);

      const blob = dataSource.images.at(index1)?.source;
      if (blob) {
        set(viewingImageAtom, {
          type: "single",
          source: dataSource.images[index1].source,
        });
      }
      // 最終ページに到達したときはスライドショーを停止
      if (get($openingImageIndexAtom) === get($imageNameListAtom).length - 1) {
        set(stopSlideshowAtom);
      }
      return;
    }

    // 1枚目が横長のときは、1枚目のみを表示する
    if (dataSource.images[index1].orientation === "landscape") {
      set(viewingImageAtom, {
        type: "single",
        source: dataSource.images[index1].source,
      });
      return;
    }

    await set(updateImageDataAtom, [index1, index2]);

    // 1枚目と2枚目が両方とも縦長のときは、2枚とも表示する
    if (
      dataSource.images[index1].orientation === "portrait" &&
      dataSource.images[index2].orientation === "portrait"
    ) {
      set(viewingImageAtom, {
        type: "double",
        source1: dataSource.images[index1].source,
        source2: dataSource.images[index2].source,
      });
      // 最終ページに到達したときはスライドショーを停止
      if (get($imageNameListAtom).length - 2 <= get($openingImageIndexAtom)) {
        set(stopSlideshowAtom);
      }
      return;
    }

    // 1枚目が縦長で2枚目が横長のときは、1枚目のみを表示する
    set(viewingImageAtom, {
      type: "single",
      source: dataSource.images[index1].source,
    });
  }
);

/**
 * 現在開いているデータソースのパスをセットする atom
 *
 * データソースを新たに開いたときと、名前を変更したときに呼び出す際の共通処理として、以下の処理を行う
 *
 * - 保持しているパス情報の更新
 * - ウィンドウタイトルの更新
 *
 * 呼び出し前に、開いているデータソースの種類をセットしておく必要がある
 */
const updateOpeningSourcePathAtom = atom(null, async (get, set, path: string) => {
  const appMode = get(appModeAtom);

  set($openingSourcePathAtom, path);

  if (appMode === "zip") {
    // アーカイブのファイル名をウィンドウのタイトルに設定
    const zipName = path.split("/").pop();
    if (zipName) {
      getCurrentWindow().setTitle(zipName);
    }
  } else {
    // ディレクトリ名をウィンドウのタイトルに設定
    const dirPath = await dirFromPath(path);
    const dirName = dirPath.split("/").pop();
    if (dirName) {
      getCurrentWindow().setTitle(dirName);
    }
  }
});

/**
 * 各データソースで、最後に開いた画像のインデックスを取得・更新する atom
 *
 * `get` では、現在開いているデータソースで、最後に記録されているインデックスを返す。
 * 過去の履歴がない場合は `0` を返す。
 * 呼び出すのはデータソースを開いて `$openingSourcePathAtom` をセットした後のみを想定した作り。
 *
 * `set` では、現在開いているデータソースで、保持している履歴がある場合はインデックスを更新し、ない場合は新たに追加する。
 * ページを切り替えたときに呼び出す想定。
 */
const lastOpenIndexAtom = atom(
  (get) => {
    const array = get($lastIndexArrayAtom);
    const path = get($openingSourcePathAtom);
    if (!path) {
      return 0;
    }
    for (const v of array) {
      if (v.path === path) {
        // 過去に開いていた場合はそのインデックスを返す
        return v.index;
      }
    }
    // 初めて開く場合は最初のページを表示するために `0` を返す
    return 0;
  },
  (get, set, path: string, index: number) => {
    const array = get($lastIndexArrayAtom);
    for (const v of array) {
      if (v.path === path) {
        // 当該パスの過去の履歴がある場合はインデックスを更新してセットする
        v.index = index;
        set($lastIndexArrayAtom, array);
        return;
      }
    }
    // 当該パスの過去の履歴がない場合は新たに追加する
    array.push({ path, index });
    set($lastIndexArrayAtom, array);
  }
);

/**
 * 画像を表示する前に、画像のデータを更新する atom
 */
const updateImageDataAtom = atom(
  null,
  async (get, set, targets: number[] | string[] | undefined) => {
    if (!targets) {
      return;
    }

    // const t = targets[0];
    // if (!t) {
    //   return;
    // }

    const source = get($openingSourceAtom);
    if (!source) {
      return;
    }

    if (isNumberArray(targets)) {
      // 画像のインデックスが指定されたときは、当該インデックスのデータを更新する
      for (const n of targets) {
        source.images[n].orientation = await getImageOrientation(source.images[n].source);
      }
    }
    // TODO: ファイル名を渡したときの処理

    set($openingSourceAtom, source);
  }
);

/**
 * 型ガード
 */
function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}
