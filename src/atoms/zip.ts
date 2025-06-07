import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { rename, exists } from "@tauri-apps/plugin-fs";
import * as fflate from "fflate";
import { atom } from "jotai";
import { type ZipData } from "../types/data";
import { AppEvent } from "../types/event";
import {
  getFileNameRemovedExtension,
  getFileList,
  createRenamedPathToExcludeExtensionName,
  createExclamationAddedPath,
} from "../utils/files";
import { getImageOrientation, searchAtBrowser } from "../utils/utils";
import {
  appModeAtom,
  isOpeningRenameViewAtom,
  resetSlideshowAtom,
  singleOrDoubleAtom,
  stopSlideshowAtom,
  viewingImageAtom,
} from "./app";

type LastIndex = {
  path: string;
  index: number;
};

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 内部データ保持 atom
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * 開いているアーカイブのデータを保持する atom
 *
 * export for testing
 */
export const $openingZipDataAtom = atom<ZipData | undefined>(undefined);

/**
 * アーカイブ内のファイル名のリストを保持する atom
 *
 * export for testing
 */
export const $imageNameListAtom = atom<string[]>([]);

/**
 * 表示している画像ファイルのインデックスを保持する atom
 *
 * 2枚表示時は若い方のインデックス
 *
 * export for testing
 */
export const $openingImageIndexAtom = atom<number>(0);

/**
 * 現在開いているアーカイブファイルのパスを保持する atom
 *
 * 何も開いていない初期状態では `undefined`
 */
const $openingArchivePathAtom = atom<string | undefined>();

/**
 * 「前」のアーカイブファイルのパスを保持する atom
 *
 * 「前」が存在しないときは `undefined`
 */
const $prevArchivePathAtom = atom<string | undefined>();

/**
 * 「次」のアーカイブファイルのパスを保持する atom
 *
 * 「次」が存在しないときは `undefined`
 */
const $nextArchivePathAtom = atom<string | undefined>();

/**
 * 対象フォルダ内にあるアーカイブファイルのリストを保持する atom
 */
const $archivePathListAtom = atom<string[]>([]);

/**
 * 各アーカイブファイルで最後に開いた画像のインデックスを保持する atom
 */
const $lastIndexArrayAtom = atom<LastIndex[]>([]);

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 外部公開 atom
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * アーカイブ（zip ファイル）を開く atom
 *
 * 渡されたパス(ローカル)の zip ファイルを解凍し、画像ファイルのデータ (Blob) を取得する
 *
 * 過去に開いた履歴があれば最後に開いていたページを、そうでなければ最初のページを表示する
 */
export const openZipAtom = atom(null, async (get, set, path: string | undefined) => {
  // パスがない場合は何もしない
  if (!path) {
    return;
  }

  const response = await fetch(convertFileSrc(path));
  const arrayBuffer = await response.arrayBuffer();
  const unzipped = fflate.unzipSync(new Uint8Array(arrayBuffer));

  // フォルダ内のアーカイブファイルのリストを更新
  await set(updateArchiveListAtom, path);
  set(setOpeningArchivePathAtom, path);

  // ウィンドウを前面に出す
  getCurrentWindow().setFocus();

  set(appModeAtom, "zip");

  // スライドショーを停止する
  set(stopSlideshowAtom);

  // zip ファイルの中身から不要なファイルを除外して画像ファイルだけに絞り込む
  const fileNames = Object.keys(unzipped)
    .filter((name) => !name.startsWith("__MACOSX/")) // Mac のリソースファイルを除く
    .filter((name) => !name.endsWith("/")) // ディレクトリを除く
    .filter((name) => /\.(jpe?g|png|gif|bmp|webp)$/i.test(name)) // 画像ファイルの拡張子を持つファイルだけを対象にする
    .sort();
  set($imageNameListAtom, fileNames);

  // 生データを Blob に変換
  const bufData = fileNames.reduce<ZipData>((acc, name) => {
    const blob = new Blob([unzipped[name]]);
    acc[name] = { blob };
    return acc;
  }, {});

  // 初期化したデータを保持
  set($openingZipDataAtom, bufData);

  // 前後のアーカイブファイルのパスを更新して保持する
  const archiveList = get($archivePathListAtom);
  const archiveIndex = archiveList.findIndex((p) => p === path); // 現在のアーカイブのインデックスを探す
  if (archiveIndex !== -1) {
    // 現在のアーカイブが見付かったときのみ保持する（基本的に見付かるはず）
    // 前後のファイルが存在しないときは、自動的に undefined が入るので気にしない
    const prevPath = archiveList[archiveIndex - 1];
    const nextPath = archiveList[archiveIndex + 1];
    set($prevArchivePathAtom, prevPath);
    set($nextArchivePathAtom, nextPath);
  }

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

/**
 * 現在開いているアーカイブのパスをセットする atom
 *
 * 開いているアーカイブのファイル名を変更したときに呼び出す
 *
 * 実行時に行うこと
 * - 保持しているパス情報の更新
 * - ウィンドウのタイトルの更新
 *
 * 実行時に行わないこと
 * - アーカイブのデータ更新
 * - 前後アーカイブパスの更新
 */
const setOpeningArchivePathAtom = atom(null, (_, set, path: string) => {
  set($openingArchivePathAtom, path);

  // アーカイブのファイル名をウィンドウのタイトルに設定
  const zipName = path.split("/").pop();
  if (zipName) {
    getCurrentWindow().setTitle(zipName);
  }
});

/**
 * zip ファイルを開いているかどうかを取得する atom
 */
export const isOpenZipAtom = atom((get) => {
  return get($openingZipDataAtom) !== undefined;
});

/**
 * アーカイブ内の画像のパスの一覧を取得する atom
 */
export const imageListAtom = atom((get) => {
  return get($imageNameListAtom);
});

/**
 * 最初のページを表示しているかどうかを取得する atom
 *
 * zip ファイルを開いていないときは false を返す
 */
export const isFirstPageAtom = atom((get) => {
  if (!get(isOpenZipAtom)) {
    return false;
  }
  const index = get($openingImageIndexAtom);
  return index === 0;
});

/**
 * 最後のページを表示しているかどうかを取得する atom
 *
 * zip ファイルを開いていないときは false を返す
 */
export const isLastPageAtom = atom((get) => {
  if (!get(isOpenZipAtom)) {
    return false;
  }
  const imageList = get($imageNameListAtom);
  const index = get($openingImageIndexAtom);
  // 最後の画像を1枚のみ表示している場合は true
  if (index === imageList.length - 1) {
    return true;
  }
  // 最後の2枚より前を表示している場合は false
  if (index < imageList.length - 2) {
    return false;
  }
  // 最後から2枚目をインデックスが示しているとき、見開き表示かどうかを加味して判定
  const imageProperty = get(viewingImageAtom);
  // 一応、画像情報がないときは false を返しておく
  if (!imageProperty) {
    return false;
  }
  return imageProperty.type === "double";
});

/**
 * アーカイブ内で開いている画像のインデックスを取得する atom
 */
export const openingImageIndexAtom = atom((get) => {
  return get($openingImageIndexAtom);
});

/**
 * 開いているアーカイブのパスから、拡張子を取り除いたファイル名を取得する atom
 */
export const openingArchivePathWithoutExtension = atom((get) => {
  const path = get($openingArchivePathAtom);
  if (!path) {
    return "";
  }
  return getFileNameRemovedExtension(path);
});

/**
 * 前のアーカイブファイル名（拡張子なし）を取得する atom
 */
export const prevArchiveNameWithoutExtensionAtom = atom((get) => {
  const path = get($prevArchivePathAtom);
  if (!path) {
    return "";
  }
  return getFileNameRemovedExtension(path);
});

/**
 * 次のアーカイブファイル名（拡張子なし）を取得する atom
 */
export const nextArchiveNameWithoutExtensionAtom = atom((get) => {
  const path = get($nextArchivePathAtom);
  if (!path) {
    return "";
  }
  return getFileNameRemovedExtension(path);
});

/**
 * 操作イベントを処理する atom
 */
export const handleAppEvent = atom(
  null,
  async (get, set, event: AppEvent | { event: AppEvent; payload: number | string }) => {
    const singleOrDouble = get(singleOrDoubleAtom);

    if (typeof event === "object") {
      if (event.event === AppEvent.RENAME_ARCHIVE) {
        set(renameArchiveAtom, String(event.payload));
      }
      return;
    }

    switch (event) {
      case AppEvent.MOVE_NEXT_PAGE: {
        if (singleOrDouble === "single") {
          set(moveNextSingleImageAtom);
          break;
        }
        set(moveNextPageAtom);
        break;
      }
      case AppEvent.MOVE_PREV_PAGE: {
        if (singleOrDouble === "single") {
          set(movePrevSingleImageAtom);
          break;
        }
        set(movePrevPageAtom);
        break;
      }
      case AppEvent.MOVE_NEXT_SINGLE_IMAGE: {
        set(moveNextSingleImageAtom);
        break;
      }
      case AppEvent.MOVE_PREV_SINGLE_IMAGE: {
        set(movePrevSingleImageAtom);
        break;
      }
      case AppEvent.MOVE_FIRST_PAGE: {
        set(moveFirstImageAtom);
        break;
      }
      case AppEvent.MOVE_LAST_PAGE: {
        set(moveLastImageAtom);
        break;
      }
      case AppEvent.SWITCH_NEXT_ARCHIVE: {
        set(openNextArchiveAtom);
        break;
      }
      case AppEvent.SWITCH_PREV_ARCHIVE: {
        set(openPrevArchiveAtom);
        break;
      }
      case AppEvent.SWITCH_RANDOM_ARCHIVE: {
        set(openRandomArchiveAtom);
        break;
      }
      case AppEvent.ADD_EXCLAMATION_MARK: {
        set(renameAddExclamationMarkAtom);
        break;
      }
      case AppEvent.SEARCH_FILE_NAME: {
        searchAtBrowser(get(openingArchivePathWithoutExtension));
        break;
      }
      case AppEvent.UPDATE_PAGE: {
        set(updatePageAtom);
        break;
      }
    }
  }
);

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
    const imageList = get($imageNameListAtom);
    const zipData = get($openingZipDataAtom);
    const singleOrDouble = get(singleOrDoubleAtom);

    if (!zipData) {
      return;
    }

    const name1 = imageList[index];
    const name2 = imageList[index + 1];

    // 指定されたインデックスのファイルが存在しないときは何もしない
    if (!name1) {
      return;
    }

    // ページ移動したため、スライドショーの経過時間をリセット
    // 手動と自動(スライドショー)の区別なくリセットしても問題ない
    set(resetSlideshowAtom);

    set($openingImageIndexAtom, index);

    // このアーカイブで最後に開いたインデックスを保持
    const archivePath = get($openingArchivePathAtom);
    if (archivePath) {
      set(lastOpenIndexAtom, archivePath, index);
    }

    // 強制的に1枚のみを表示する
    if (forceSingle || singleOrDouble === "single") {
      await convertData(zipData, name1);
      set($openingZipDataAtom, zipData);
      set(viewingImageAtom, {
        type: "single",
        source: zipData[name1].blob,
      });
      // 最終ページに到達したときはスライドショーを停止
      if (get($openingImageIndexAtom) === get($imageNameListAtom).length - 1) {
        set(stopSlideshowAtom);
      }
      return;
    }

    await convertData(zipData, name1);
    await convertData(zipData, name2);
    set($openingZipDataAtom, zipData);

    // 1枚目が横長のときは、1枚目のみを表示する
    if (zipData[name1].orientation === "landscape") {
      set(viewingImageAtom, {
        type: "single",
        source: zipData[name1].blob,
      });
      return;
    }

    // 1枚目が最後の画像のとき(2枚目がない)は、1枚目のみを表示する
    if (!name2) {
      set(viewingImageAtom, {
        type: "single",
        source: zipData[name1].blob,
      });
      set(stopSlideshowAtom); // 最終ページに到達したのでスライドショーを停止
      return;
    }

    // 1枚目と2枚目が両方とも縦長のときは、2枚とも表示する
    if (zipData[name1].orientation === "portrait" && zipData[name2].orientation === "portrait") {
      set(viewingImageAtom, {
        type: "double",
        source1: zipData[name1].blob,
        source2: zipData[name2].blob,
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
      source: zipData[name1].blob,
    });
  }
);

/**
 * 次のページを表示する atom
 *
 * export for testing
 */
export const moveNextPageAtom = atom(null, async (get, set) => {
  const openIndex = get($openingImageIndexAtom);
  const imageData = get(viewingImageAtom);

  if (!imageData) {
    return;
  }

  // 現在の表示枚数を元に、次のインデックスを計算する
  // 最終ページからのはみ出しは、呼び出された moveIndexAtom 側で判定して処理する
  const index = imageData.type === "single" ? openIndex + 1 : openIndex + 2;

  set(moveIndexAtom, { index });
});

/**
 * 前のページを表示する atom
 *
 * 前のページに相当する画像の縦横を元に、表示する枚数を判定する
 *
 * 現在表示している画像は重複して表示しないのが基本。したがって縦画像が1枚だけ表示されるケースもあり得る。
 *
 * 右開きのときの動作は以下の表の通り。「0枚目」は表示中の若い方を指す。
 *
 * 0枚目 | -1枚目 | -2枚目 | 表示
 * :--: | :--: | :--: | :--:
 * 縦0 | 縦1 | 縦2 | 縦1 縦2
 * 縦0 | 縦1 | 横2 | 縦1
 * 横0 | 縦1 | 縦2 | 縦1 縦2
 * 横0 | 縦1 | 横2 | 縦1
 * 縦0 | 縦1 | (なし) | 縦1
 * 縦0 | 横1 | (なし) | 横1
 * 横0 | 縦1 | (なし) | 縦1
 * 横0 | 横1 | (なし) | 横1
 *
 * export for testing
 */
export const movePrevPageAtom = atom(null, async (get, set) => {
  const imageList = get($imageNameListAtom);
  const index = get($openingImageIndexAtom);
  const zipData = get($openingZipDataAtom);

  if (!zipData) {
    return;
  }

  const name0 = imageList[index];
  const name1 = imageList[index - 1];
  const name2 = imageList[index - 2];

  // 前ページ（と現ページ）を取得できなかった場合は何もしない
  if (!name0 || !name1) {
    return;
  }

  await convertData(zipData, name0);
  await convertData(zipData, name1);
  await convertData(zipData, name2);
  set($openingZipDataAtom, zipData);

  // -1枚目が横のとき、-1枚目が最初の画像のとき(-2枚目がなかったとき)、-2枚目が横だったときは、1枚だけ戻って-1枚目のみを表示する
  if (
    zipData[name1].orientation === "landscape" ||
    !name2 ||
    (name2 && zipData[name2].orientation === "landscape")
  ) {
    // 最初の画像が 縦縦 と並んでいるときに見開き表示とならないよう、1枚表示を強制
    set(moveIndexAtom, { index: index - 1, forceSingle: true });
    return;
  }

  // -1枚目と-2枚目が両方とも縦長のときは、見開き表示する
  set(moveIndexAtom, { index: index - 2 });
});

/**
 * 1枚だけ次の画像に移動する atom
 *
 * export for testing
 */
export const moveNextSingleImageAtom = atom(null, async (get, set) => {
  const imageList = get($imageNameListAtom);
  const index = get($openingImageIndexAtom);
  const imageProperty = get(viewingImageAtom);

  if (!imageProperty) {
    return;
  }

  // 最後の画像を表示しているときは何もしない
  if (imageList.length - 1 <= index) {
    return;
  }

  // 最後のページとして2枚表示されている場合は移動せず見開きのままとする
  if (imageProperty.type === "double" && imageList.length - 2 <= index) {
    return;
  }

  set(moveIndexAtom, { index: index + 1 });
});

/**
 * 1枚だけ前の画像へ移動する atom
 *
 * 右開き（右が若い）で挙動を示すと以下の通り。（表示が「|」の中）
 * - |縦 縦0| 縦1 縦2 → 縦 |縦0 縦1| 縦2
 * - |縦 縦0| 縦1 横2 → 縦 |縦0 縦1| 横2
 * - |縦 縦0| 横1 → 縦 縦0 |横1|
 * - |横0| 縦1 縦2 → 横0 |縦1 縦2|
 * - |横0| 縦1 横2 → 横0 |縦1| 横2
 * - |横0| 横1 縦2 → 横0 |横1| 縦2
 * - (最後の画像が縦で1枚のみ表示されているケースは、|縦 縦0| 開始と同じパターン)
 *
 * export for testing
 */
export const movePrevSingleImageAtom = atom(null, async (get, set) => {
  const imageList = get($imageNameListAtom);
  const index = get($openingImageIndexAtom);
  const zipData = get($openingZipDataAtom);

  if (!zipData) {
    return;
  }

  const name0 = imageList[index];
  const name1 = imageList[index - 1];
  const name2 = imageList[index - 2];

  if (!name0 || !name1) {
    return;
  }

  await convertData(zipData, name0);
  await convertData(zipData, name1);
  await convertData(zipData, name2);
  set($openingZipDataAtom, zipData);

  // 現在、横画像を表示していて、-1枚目と-2枚目が両方とも縦長のときは、2枚戻って見開き表示する
  if (
    zipData[name0].orientation === "landscape" &&
    name2 &&
    zipData[name1].orientation === "portrait" &&
    zipData[name2].orientation === "portrait"
  ) {
    set(moveIndexAtom, { index: index - 2 });
    return;
  }

  // それ以外のときは、-1枚目のみを基準に表示する (見開き判定は表示処理で実施)
  set(moveIndexAtom, { index: index - 1 });
});

/**
 * 最初のページを表示する atom
 *
 * テストのために export
 */
export const moveFirstImageAtom = atom(null, async (_, set) => {
  set(moveIndexAtom, { index: 0 });
});

/**
 * 最後のページを表示する atom
 *
 * 最後の2枚が縦画像だったら見開き表示する
 */
const moveLastImageAtom = atom(null, async (get, set) => {
  const imageList = get($imageNameListAtom);
  const zipData = get($openingZipDataAtom);

  if (!zipData) {
    return;
  }

  // 最後の2枚を取得する。name1 の方が若く、name2 が本当に最後
  const lastIndex = imageList.length - 1;
  const name1 = imageList[lastIndex - 1];
  const name2 = imageList[lastIndex];

  if (!name2) {
    return;
  }

  await convertData(zipData, name1);
  await convertData(zipData, name2);
  set($openingZipDataAtom, zipData);

  // 1枚目と2枚目の両方が縦長のときは、2枚とも表示する
  if (zipData[name1].orientation === "portrait" && zipData[name2].orientation === "portrait") {
    set(moveIndexAtom, { index: lastIndex - 1 });
    return;
  }

  // その他のときは最後の画像のみを表示する
  set(moveIndexAtom, { index: lastIndex });
});

/**
 * 開いているアーカイブファイルをリネームする atom
 */
const renameArchiveAtom = atom(null, async (get, set, name: string) => {
  const beforePath = get($openingArchivePathAtom);

  if (!beforePath) {
    return;
  }

  const newPath = await createRenamedPathToExcludeExtensionName(beforePath, name);

  // リネームして、変更後のファイル名を開いていることにする
  rename(beforePath, newPath);
  set(setOpeningArchivePathAtom, newPath);
});

/**
 * 現在のページの表示を更新する atom
 *
 * 表示モードを切り替えたときなどに呼び出す
 */
const updatePageAtom = atom(null, async (get, set) => {
  const index = get($openingImageIndexAtom);
  set(moveIndexAtom, { index });
});

// -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -
// #region アーカイブ操作系
// -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -

/**
 * 渡されたパスに存在するアーカイブファイルのリストを更新する
 *
 * ファイルの一覧を文字列の配列で取得し、ロケールを考慮してソートして Mac (Finder) の並びと同じにしてからセットする
 */
const updateArchiveListAtom = atom(null, async (_, set, path: string) => {
  const fileList = await getFileList(path, "zip");

  // Rust 実装を使う場合は下記のコードで実行し、ソートを TS 側で行う
  // const fileList = (await invoke("get_archive_file_list", {
  //   path,
  // })) as string[];

  // // ロケールを考慮してソートし、Finder のファイル名の並び順と同じにする
  // fileList.sort((a, b) => a.localeCompare(b, [], { numeric: true }));

  set($archivePathListAtom, fileList);
});

/**
 * 次のアーカイブファイルを開く
 */
const openNextArchiveAtom = atom(null, async (get, set) => {
  const path = get($nextArchivePathAtom);
  set(openZipAtom, path);
});

/**
 * 前のアーカイブファイルを開く
 */
const openPrevArchiveAtom = atom(null, async (get, set) => {
  const path = get($prevArchivePathAtom);
  set(openZipAtom, path);
});

/**
 * 現在のフォルダ内にあるランダムなアーカイブファイルを開く
 *
 * - 現在開いているアーカイブと同じものは開かない
 * - 稀に失敗することがある
 */
const openRandomArchiveAtom = atom(null, async (get, set) => {
  const archiveList = get($archivePathListAtom);
  const currentPath = get($openingArchivePathAtom);
  if (!currentPath) {
    return;
  }

  // アーカイブファイルのリストから、現在開いているファイルを取り除く
  const list = archiveList.filter((path) => path !== currentPath);
  if (list.length === 0) {
    // ディレクトリ内が現在のアーカイブのみだった場合は何もしない
    return;
  }

  // ランダムなファイル選択を規定回数行う
  // ループしているのは、選んだファイルが移動・削除されている可能性があるため
  // 回数を制限しているのは、全ファイルが削除されているような場合に無限ループになるのを防ぐため
  let count = 0;
  while (count < 100) {
    count++;
    const index = Math.floor(Math.random() * list.length);
    const path = list[index];
    if (path !== currentPath && (await exists(path))) {
      set(openZipAtom, path);
      return;
    }
  }
  // TODO: 開けなかった場合にメッセージを表示する
});

/**
 * 現在開いているファイルに対して、ファイル名の先頭にビックリマークを付与してリネームする
 */
const renameAddExclamationMarkAtom = atom(null, async (get, set) => {
  const path = get($openingArchivePathAtom);

  // ファイルを開いていないときは何もしない
  if (!path) {
    return;
  }

  // ファイル名にビックリマークを付与してリネーム
  const newPath = await createExclamationAddedPath(path);

  // リネームして、変更後のファイル名を開いていることにする
  rename(path, newPath);
  set(setOpeningArchivePathAtom, newPath);
});

// -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -
// #region その他
// -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -

/**
 * 各アーカイブファイルで、最後に開いた画像のインデックスを取得・更新する atom
 *
 * `get` では、現在開いているアーカイブ `$openingArchivePathAtom` で、最後に記録されているインデックスを返す。
 * 過去の履歴がない場合は `0` を返す。
 * 呼び出すのはアーカイブファイルを開いて `$openingArchivePathAtom` をセットした後のみを想定した作り。
 *
 * `set` では、現在開いているアーカイブ `$openingArchivePathAtom` で、保持している履歴がある場合はインデックスを更新し、ない場合は新たに追加する。
 * ページを切り替えたときに呼び出す想定。
 */
const lastOpenIndexAtom = atom(
  (get) => {
    const array = get($lastIndexArrayAtom);
    const path = get($openingArchivePathAtom);
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

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region ユーティリティ
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * データを変換する
 *
 * 現状では画像の向きの取得のみを行う
 *
 * 基本的に、この関数を呼び出したときは await して終了を待つ必要がある
 */
async function convertData(target: ZipData, fileName: string | undefined) {
  if (fileName && !target[fileName].orientation) {
    target[fileName].orientation = await getImageOrientation(target[fileName].blob);
  }
}
