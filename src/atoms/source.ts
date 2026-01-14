import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { exists, rename } from "@tauri-apps/plugin-fs";
import * as fflate from "fflate";
import { atom } from "jotai";
import type { DataSource, LastIndex } from "../types/data";
import { AppEvent } from "../types/event";
import {
  createExclamationAddedPath,
  createRenamedPathToExcludeExtensionName,
  dirFromPath,
  getFileList,
  getFileNameRemovedExtension,
  getPathKind,
  parentDirPath,
} from "../utils/files";
import { moveLastPage, moveNextSingleImage, movePrevSingleImage } from "../utils/pages";
import { getImageOrientation, searchAtBrowser } from "../utils/utils";
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
 */
const $openingSourceAtom = atom<DataSource | undefined>(undefined);

/**
 * 表示している画像ファイルのインデックスを保持する atom
 *
 * 見開き(2枚)表示時は、若い方のインデックス
 */
const $openingImageIndexAtom = atom<number>(0);

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

    set($openingSourceAtom, source); // 初期化したデータを保持
    set(appModeAtom, "zip");
  } else {
    // フォルダまたは画像を開く場合
    const fileList = await getFileList(path, "image"); // 画像ファイルの一覧を取得

    if (fileList.length === 0) {
      return; // ディレクトリ内に画像ファイルがない場合は何もしない
      // TODO: 前後のデータソースに移動後、フォルダ内に画像ファイルが存在しないときの挙動を検討
    }

    // 画像ファイル一覧を保持データへ変換
    const images = [];
    for (const name of fileList) {
      images.push({ name, source: name, orientation: undefined });
    }
    const parent = await parentDirPath(path);
    const siblings = parent != undefined ? await getFileList(parent, "directory") : [];
    const source = { images, siblings };

    set($openingSourceAtom, source); // 初期化したデータを保持
    set(appModeAtom, "image");
  }

  // 保持するデータソースのパスとウィンドウのタイトルを更新
  if (kind === "image") {
    set(updateOpeningSourcePathAtom, await dirFromPath(path)); // 画像を開いたときは、開いたインデックスの保存のために、そのディレクトリを保存する
  } else {
    set(updateOpeningSourcePathAtom, path);
  }

  getCurrentWindow().setFocus(); // ウィンドウを前面に出す
  set(stopSlideshowAtom); // スライドショーを停止する

  // 前後のデータソースのパスを更新して保持する
  const dataSource = get($openingSourceAtom);
  const appMode = get(appModeAtom);
  if (dataSource) {
    const siblings = dataSource.siblings;
    // 前後の基準となる、現在開いているデータソースのパス
    const target =
      appMode === "zip"
        ? path // アーカイブを開いているときは、そのアーカイブ
        : await dirFromPath(path); // 画像を直接開いたときは、画像ではなくディレクトリのパスを見る必要がある
    const index = siblings.findIndex((p) => p === target); // 兄弟の中で、現在のデータソースのインデックスを探す

    if (index !== -1) {
      // 現在のデータソースが見つかったときのみ保持する（基本的に見つかるはず）
      // 前後のファイルが存在しないときは undefined をセットする
      const prevPath = siblings[index - 1];
      const nextPath = siblings[index + 1];
      set($prevSourcePathAtom, prevPath);
      set($nextSourcePathAtom, nextPath);
    }
  }

  // リネームビューを閉じる
  // リネームビューを開いている状態で、テキストフィールドからフォーカスを外してアーカイブ移動（カーソル上下）したとき、
  // テキストフィールドの内容と実際のファイルとの紐付けがゴチャゴチャになるので、一旦閉じる
  set(isOpeningRenameViewAtom, false);

  // 当該アーカイブを最後に開いていたときのインデックスを取得。初めて開く場合は 0
  let index = get(lastOpenIndexAtom);
  // 画像を直接指定して開いた場合は、そのインデックス
  if (kind === "image") {
    const paths = dataSource?.images.map((v) => v.source) ?? [];
    const idx = paths.findIndex((file) => file === path);
    if (idx !== -1) {
      index = idx;
    }
  }

  // ページを表示
  set(moveIndexAtom, { index });
});

/**
 * 操作イベントを処理する atom
 */
export const handleAppEvent = atom(
  null,
  async (get, set, event: AppEvent | { event: AppEvent; payload: number | string }) => {
    const singleOrDouble = get(singleOrDoubleAtom);

    if (typeof event === "object") {
      if (event.event === AppEvent.RENAME_SOURCE) {
        set(renameSourceAtom, String(event.payload));
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
      case AppEvent.SWITCH_NEXT_SOURCE: {
        set(openNextSourceAtom);
        break;
      }
      case AppEvent.SWITCH_PREV_SOURCE: {
        set(openPrevSourceAtom);
        break;
      }
      case AppEvent.SWITCH_RANDOM_SOURCE: {
        set(openRandomSourceAtom);
        break;
      }
      case AppEvent.ADD_EXCLAMATION_MARK: {
        set(renameAddExclamationMarkAtom);
        break;
      }
      case AppEvent.SEARCH_FILE_NAME: {
        searchAtBrowser(get(openingSourcePathWithoutExtension));
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
      index: number | undefined;
      /** 強制的に1枚表示にするかどうかのフラグ */
      forceSingle?: boolean;
    }
  ) => {
    const dataSource = get($openingSourceAtom);
    const singleOrDouble = get(singleOrDoubleAtom);

    if (!dataSource || index === undefined) {
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
      if (get($openingImageIndexAtom) === dataSource.images.length - 1) {
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
      if (dataSource.images.length - 2 <= get($openingImageIndexAtom)) {
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
 * 次のページを表示する atom
 */
const moveNextPageAtom = atom(null, async (get, set) => {
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
 * 現在表示している画像は重複して表示しない。したがって縦画像が1枚だけ表示されるケースもあり得る
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
 */
const movePrevPageAtom = atom(null, async (get, set) => {
  // const imageList = get($imageNameListAtom);
  const index = get($openingImageIndexAtom);
  const dataSource = get($openingSourceAtom);

  if (!dataSource) {
    return;
  }

  const index1 = 1 <= index ? index - 1 : undefined;
  const index2 = 2 <= index ? index - 2 : undefined;

  // 前ページを取得できなかった場合は何もしない
  if (index1 === undefined) {
    return;
  }

  if (index2 === undefined) {
    await set(updateImageDataAtom, [index1]);
  } else {
    await set(updateImageDataAtom, [index1, index2]);
  }

  // -1枚目が横のとき、-1枚目が最初の画像のとき(-2枚目がなかったとき)、-2枚目が横だったときは、1枚だけ戻って-1枚目のみを表示する
  if (
    dataSource.images[index1].orientation === "landscape" ||
    index2 === undefined ||
    dataSource.images[index2].orientation === "landscape"
  ) {
    set(moveIndexAtom, { index: index - 1, forceSingle: true }); // 最初の画像が 縦縦 と並んでいるときに見開き表示とならないよう、1枚表示を強制
    return;
  }

  // -1枚目と-2枚目が両方とも縦長のときは、見開き表示する
  set(moveIndexAtom, { index: index - 2 });
});

/**
 * 1枚だけ次の画像に移動する atom
 */
const moveNextSingleImageAtom = atom(null, async (get, set) => {
  const index = get($openingImageIndexAtom);
  const dataSource = get($openingSourceAtom);
  const imageProperty = get(viewingImageAtom);

  const result = moveNextSingleImage({ index, dataSource, imageProperty });

  set(moveIndexAtom, { index: result });
});

/**
 * 1枚だけ前の画像へ移動する atom
 *
 * 見開き状態等に関係なく、インデックスを1つだけ前に移動する
 */
const movePrevSingleImageAtom = atom(null, async (get, set) => {
  const index = get($openingImageIndexAtom);
  const dataSource = get($openingSourceAtom);

  const result = movePrevSingleImage({ index, dataSource });

  // 1枚分だけ前に戻り、見開き判定は表示処理側で実施
  set(moveIndexAtom, { index: result });
});

/**
 * 最初のページを表示する atom
 */
const moveFirstImageAtom = atom(null, async (_, set) => {
  set(moveIndexAtom, { index: 0 });
});

/**
 * 最後のページを表示する atom
 *
 * 最後の2枚が両方とも縦画像の場合、見開き表示する
 */
const moveLastImageAtom = atom(null, async (get, set) => {
  const dataSource = get($openingSourceAtom);
  const singleOrDouble = get(singleOrDoubleAtom);
  const updateData = (indexes: number[]) => set(updateImageDataAtom, indexes);

  const result = await moveLastPage({ dataSource, singleOrDouble, updateData });

  set(moveIndexAtom, { index: result });
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

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region データソース操作系
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * 次のデータソースを開く
 */
const openNextSourceAtom = atom(null, async (get, set) => {
  const path = get($nextSourcePathAtom);
  set(openFileAtom, path);
});

/**
 * 前のデータソースを開く
 */
const openPrevSourceAtom = atom(null, async (get, set) => {
  const path = get($prevSourcePathAtom);
  set(openFileAtom, path);
});

/**
 * 開いているデータソースがあるフォルダ内にある、別のランダムなデータソースを開く
 *
 * - 現在開いているデータソースと同じものは開かない
 * - データソースの数が少なくて極端に運が悪い場合、ごく稀に失敗することがある
 */
const openRandomSourceAtom = atom(null, async (get, set) => {
  const dataSource = get($openingSourceAtom);
  const currentPath = get($openingSourcePathAtom);
  if (!dataSource || !currentPath) {
    return;
  }
  const sourceList = dataSource?.siblings;

  // アーカイブファイルのリストから、現在開いているファイルを取り除く
  const list = sourceList.filter((path) => path !== currentPath);
  if (list.length === 0) {
    return; // ディレクトリ内が現在のアーカイブのみだった場合は何もしない
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
      set(openFileAtom, path);
      return;
    }
  }
  // TODO: 開けなかった場合にメッセージを表示する
});

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
 * 現在開いているデータソースに対して、名前の先頭にエクスクラメーションマークを付与してリネームする
 */
const renameAddExclamationMarkAtom = atom(null, async (get, set) => {
  const path = get($openingSourcePathAtom);

  // ファイルを開いていないときは何もしない
  if (!path) {
    return;
  }

  // ファイル名にエクスクラメーションマークを付与してリネーム
  const newPath = await createExclamationAddedPath(path);
  // リネームして、変更後のファイル名を開いていることにする
  rename(path, newPath);
  set(updateOpeningSourcePathAtom, newPath);
});

/**
 * データソースを開いているかどうかを取得する atom
 */
export const isOpenSourceAtom = atom((get) => {
  return get($openingSourceAtom) !== undefined;
});

/**
 * データソース内の画像ファイルの一覧を取得する atom
 */
export const imageListAtom = atom((get) => {
  const dataSource = get($openingSourceAtom);
  if (!dataSource) {
    return [];
  }
  const files = dataSource.images.map((v) => v.name);
  return files;
});

/**
 * 最初のページを表示しているかどうかを取得する atom
 *
 * データソースを開いていないときは false を返す
 */
export const isFirstPageAtom = atom((get) => {
  if (!get(isOpenSourceAtom)) {
    return false;
  }
  const index = get($openingImageIndexAtom);
  return index === 0;
});

/**
 * 最後のページを表示しているかどうかを取得する atom
 *
 * データソースを開いていないときは false を返す
 */
export const isLastPageAtom = atom((get) => {
  if (!get(isOpenSourceAtom)) {
    return false;
  }
  const imageList = get(imageListAtom);
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
 * データソース内で開いている画像のインデックスを取得する atom
 */
export const openingImageIndexAtom = atom((get) => {
  return get($openingImageIndexAtom);
});

/**
 * 開いているデータソースのパスから、拡張子を取り除いた名前を取得する atom
 */
export const openingSourcePathWithoutExtension = atom((get) => {
  const path = get($openingSourcePathAtom);
  if (!path) {
    return "";
  }
  return getFileNameRemovedExtension(path);
});

/**
 * 前のアーカイブファイル名（拡張子なし）を取得する atom
 */
export const prevSourceNameWithoutExtensionAtom = atom((get) => {
  const path = get($prevSourcePathAtom);
  if (!path) {
    return "";
  }
  return getFileNameRemovedExtension(path);
});

/**
 * 次のアーカイブファイル名（拡張子なし）を取得する atom
 */
export const nextSourceNameWithoutExtensionAtom = atom((get) => {
  const path = get($nextSourcePathAtom);
  if (!path) {
    return "";
  }
  return getFileNameRemovedExtension(path);
});

/**
 * 開いているデータソースをリネームする atom
 *
 * TODO: フォルダを開いているときにリネーム可能とする。現状、リネーム後の名前生成処理で拡張子がない場合が不正となるため、event.ts でリネーム不可としている。
 */
const renameSourceAtom = atom(null, async (get, set, name: string) => {
  const beforePath = get($openingSourcePathAtom);

  if (!beforePath) {
    return;
  }

  const newPath = await createRenamedPathToExcludeExtensionName(beforePath, name);

  // リネームして、変更後のファイル名を開いていることにする
  rename(beforePath, newPath);
  set(updateOpeningSourcePathAtom, newPath);
});

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region データ更新系
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

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
const updateImageDataAtom = atom(null, async (get, set, targets: (number | undefined)[]) => {
  const source = get($openingSourceAtom);
  if (!source) {
    return;
  }

  // 当該インデックスのデータを更新する
  for (const n of targets) {
    if (n === undefined) {
      continue;
    }
    if (source.images[n].orientation !== undefined) {
      continue; // すでに取得済みの場合はスキップ
    }
    source.images[n].orientation = await getImageOrientation(source.images[n].source);
  }

  set($openingSourceAtom, source);
});
