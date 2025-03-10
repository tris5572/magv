import { atom } from "jotai";
import * as fflate from "fflate";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { exists, rename } from "@tauri-apps/plugin-fs";
import { viewingImageAtom } from "./app";
import { getImageOrientation } from "../utils/utils";
import { AppEvent } from "../types/event";

/**
 * 解凍したアーカイブのデータ
 */
type ZipData = {
  /**
   * キーは画像ファイル名
   */
  [name: string]: {
    /**
     * Blob に変換した画像データ
     */
    blob: Blob;
    /**
     * 画像の向き
     *
     * 向きを未取得または取得できなかった場合は `undefined`
     */
    orientation?: "portrait" | "landscape";
  };
};

type LastIndex = {
  path: string;
  index: number;
};

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 内部データ保持 atom
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * 開いているアーカイブのデータを保持する atom
 */
const openZipDataAtom = atom<ZipData | undefined>(undefined);

/**
 * アーカイブ内のファイル名のリストを保持する atom
 *
 * export for testing
 */
export const imageNameListAtom = atom<string[]>([]);

/**
 * 表示している画像ファイルのインデックスを保持する atom
 *
 * 2枚表示時は若い方のインデックス
 *
 * export for testing
 */
export const openImageIndexAtom = atom<number>(0);

/**
 * 現在開いているアーカイブファイルのパスを保持する atom
 *
 * 何も開いていない初期状態では `undefined`
 */
const openArchivePathAtom = atom<string | undefined>();

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
const archivePathListAtom = atom<string[]>([]);

/**
 * 各アーカイブファイルで最後に開いた画像のインデックスを保持する atom
 */
const _lastIndexArrayAtom = atom<LastIndex[]>([]);

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 外部公開 atom
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * アーカイブ（zip ファイル）を開く atom
 */
export const openZipAtom = atom(
  null,
  async (get, set, path: string | undefined) => {
    // パスがない場合は何もしない
    if (!path) {
      return;
    }

    const response = await fetch(convertFileSrc(path));
    const arrayBuffer = await response.arrayBuffer();
    const unzipped = fflate.unzipSync(new Uint8Array(arrayBuffer));

    // フォルダ内のアーカイブファイルのリストを更新
    await set(updateArchiveListAtom, path);
    set(openArchivePathAtom, path);

    // アーカイブのファイル名をウィンドウのタイトルに設定
    const zipName = path.split("/").pop();
    if (zipName) {
      getCurrentWindow().setTitle(zipName);
    }

    getCurrentWindow().setFocus();

    // zip ファイルの中身から不要なファイルを除外して画像ファイルだけに絞り込む
    const fileNames = Object.keys(unzipped)
      .filter((name) => !name.startsWith("__MACOSX/")) // Mac のリソースファイルを除く
      .filter((name) => !name.endsWith("/")) // ディレクトリを除く
      .filter((name) => /\.(jpe?g|png|gif|bmp|webp)$/i.test(name)) // 画像ファイルの拡張子を持つファイルだけを対象にする
      .sort();
    set(imageNameListAtom, fileNames);

    // 生データを Blob に変換
    const bufData = fileNames.reduce<ZipData>((acc, name) => {
      const blob = new Blob([unzipped[name]]);
      acc[name] = { blob };
      return acc;
    }, {});

    // 初期化したデータを保持
    set(openZipDataAtom, bufData);

    // 前後のアーカイブファイルのパスを更新して保持する
    const archiveList = get(archivePathListAtom);
    const archiveIndex = archiveList.findIndex((p) => p === path); // 現在のアーカイブのインデックスを探す
    if (archiveIndex !== -1) {
      // 現在のアーカイブが見付かったときのみ保持する（基本的に見付かるはず）
      // 前後のファイルが存在しないときは、自動的に undefined が入るので気にしない
      const prevPath = archiveList[archiveIndex - 1];
      const nextPath = archiveList[archiveIndex + 1];
      set($prevArchivePathAtom, prevPath);
      set($nextArchivePathAtom, nextPath);
    }

    // 当該アーカイブを最後に開いていたときのインデックスを取得
    // 初めて開く場合は 0
    const index = get(lastOpenIndexAtom);

    // ページを表示
    set(moveIndexAtom, { index });
  }
);

/**
 * アーカイブ内の画像のパスの一覧を取得する atom
 */
export const imageListAtom = atom((get) => {
  return get(imageNameListAtom);
});

/**
 * アーカイブ内で開いている画像のインデックスを取得する atom
 */
export const openingImageIndexAtom = atom((get) => {
  return get(openImageIndexAtom);
});

/**
 * 開いているアーカイブのパスから、拡張子を取り除いたファイル名を取得する atom
 */
export const openingArchivePathWithoutExtension = atom((get) => {
  const path = get(openArchivePathAtom);
  if (!path) {
    return "";
  }
  return getFileNameRemovedExtension(path);
});

/**
 * 操作イベントを処理する atom
 */
export const handleAppEvent = atom(null, async (_, set, event: AppEvent) => {
  switch (event) {
    case AppEvent.MOVE_NEXT_PAGE: {
      set(nextImageAtom);
      break;
    }
    case AppEvent.MOVE_PREV_PAGE: {
      set(prevImageAtom);
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
    case AppEvent.ADD_EXCLAMATION_MARK: {
      set(renameAddExclamationMarkAtom);
      break;
    }
  }
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
    const imageList = get(imageNameListAtom);
    const zipData = get(openZipDataAtom);

    if (!zipData) {
      return;
    }

    const name1 = imageList[index];
    const name2 = imageList[index + 1];

    // 指定されたインデックスのファイルが存在しないときは何もしない
    if (!name1) {
      return;
    }

    set(openImageIndexAtom, index);

    // このアーカイブで最後に開いたインデックスを保持
    const archivePath = get(openArchivePathAtom);
    if (archivePath) {
      set(lastOpenIndexAtom, archivePath, index);
    }

    // 強制的に1枚のみを表示する
    if (forceSingle) {
      await convertData(zipData, name1);
      set(openZipDataAtom, zipData);
      set(viewingImageAtom, {
        type: "single",
        source: zipData[name1].blob,
      });
    }

    await convertData(zipData, name1);
    await convertData(zipData, name2);
    set(openZipDataAtom, zipData);

    // 1枚目が横長のときと、2枚目がないときは、1枚目のみを表示する
    if (zipData[name1].orientation === "landscape" || !name2) {
      set(viewingImageAtom, {
        type: "single",
        source: zipData[name1].blob,
      });
      return;
    }

    // 1枚目と2枚目が両方とも縦長のときは、2枚とも表示する
    if (
      zipData[name1].orientation === "portrait" &&
      zipData[name2].orientation === "portrait"
    ) {
      set(viewingImageAtom, {
        type: "double",
        source1: zipData[name1].blob,
        source2: zipData[name2].blob,
      });
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
 * 次のページに相当する画像の縦横を元に、表示する枚数を判定する
 *
 * 縦画像が1枚だけ表示されるケースもあり得る
 */
export const nextImageAtom = atom(null, async (get, set) => {
  const openIndex = get(openImageIndexAtom);
  const imageData = get(viewingImageAtom);

  if (!imageData) {
    return;
  }

  // 現在の表示枚数を元に、次のインデックスを計算する
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
 */
export const prevImageAtom = atom(null, async (get, set) => {
  const imageList = get(imageNameListAtom);
  const index = get(openImageIndexAtom);
  const zipData = get(openZipDataAtom);

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
  set(openZipDataAtom, zipData);

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
  const imageList = get(imageNameListAtom);
  const index = get(openImageIndexAtom);
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
 */
const movePrevSingleImageAtom = atom(null, async (get, set) => {
  const imageList = get(imageNameListAtom);
  const index = get(openImageIndexAtom);
  const zipData = get(openZipDataAtom);

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
  set(openZipDataAtom, zipData);

  // 現在、横画像を表示していて、-1枚目と-2枚目が両方とも縦長のときは、2枚戻って見開き表示する
  if (
    zipData[name0].orientation === "landscape" &&
    name2 &&
    zipData[name1].orientation === "portrait" &&
    zipData[name2].orientation === "portrait"
  ) {
    set(moveIndexAtom, { index: index - 2 });
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
  const imageList = get(imageNameListAtom);
  const zipData = get(openZipDataAtom);

  if (!zipData) {
    return;
  }

  // 最後の2枚を取得する。name1 の方が若く、name2 が本当に最後
  const lastIndex = imageList.length - 1;
  const name1 = imageList[lastIndex - 1];
  const name2 = imageList[lastIndex];

  if (!name1) {
    return;
  }

  await convertData(zipData, name1);
  await convertData(zipData, name2);
  set(openZipDataAtom, zipData);

  // 1枚目と2枚目の両方が縦長のときは、2枚とも表示する
  if (
    zipData[name1].orientation === "portrait" &&
    zipData[name2].orientation === "portrait"
  ) {
    set(moveIndexAtom, { index: lastIndex - 1 });
    return;
  }

  // その他のときは最後の画像のみを表示する
  set(moveIndexAtom, { index: lastIndex });
});

// -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -
// #region アーカイブ操作系
// -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -

/**
 * 渡されたパスに存在するアーカイブファイルのリストを更新する
 *
 * Rust 側からファイルの一覧を文字列の配列で取得し、
 * ロケールを考慮してソートして Mac (Finder) の並びと同じにしてからセットする
 */
const updateArchiveListAtom = atom(null, async (_, set, path: string) => {
  const fileList = (await invoke("get_archive_file_list", {
    path,
  })) as string[];

  // ロケールを考慮してソートし、Finder のファイル名の並び順と同じにする
  fileList.sort((a, b) => a.localeCompare(b, [], { numeric: true }));

  set(archivePathListAtom, fileList);
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
 * 現在開いているファイルに対して、ファイル名の先頭にビックリマークを付与してリネームする
 */
const renameAddExclamationMarkAtom = atom(null, async (get) => {
  const path = get(openArchivePathAtom);

  // ファイルを開いていないときは何もしない
  if (!path) {
    return;
  }

  // ファイル名にビックリマークを付与してリネーム
  const newPath = await createExclamationAddedPath(path);
  rename(path, newPath);
  // リネーム後は特に何もしない
  // 前後のアーカイブのパスは保持されていて、ファイル切替は上手く動く（リネーム前の前後のファイルへ移動する）
});

// -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -
// #region その他
// -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -

/**
 * 各アーカイブファイルで最後に開いた画像のインデックスを取得・更新する atom
 */
const lastOpenIndexAtom = atom(
  (get) => {
    const array = get(_lastIndexArrayAtom);
    const path = get(openArchivePathAtom);
    if (!path) {
      return 0;
    }
    for (const v of array) {
      if (v.path === path) {
        return v.index;
      }
    }
    return 0;
  },
  (get, set, path: string, index: number) => {
    const array = get(_lastIndexArrayAtom);
    for (const v of array) {
      if (v.path === path) {
        v.index = index;
        set(_lastIndexArrayAtom, array);
        return;
      }
    }
    array.push({ path, index });
    set(_lastIndexArrayAtom, array);
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
    const base64 = await base64FromBlob(target[fileName].blob);
    target[fileName].orientation = await getImageOrientation(base64);
  }
}

/**
 * Blob を Base64 に変換する
 */
export const base64FromBlob = async (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer || reader.result == null) {
        reject(new Error("FileReader result is not an string"));
      } else {
        resolve(reader.result);
      }
    };
    reader.onerror = (e) => {
      reject(e);
    };
    reader.readAsDataURL(file);
  });
};

/**
 * ビックリマークを付与したファイル名を生成する
 *
 * 変更後の名前のファイルがすでに存在している場合、存在しなくなるまで末尾に `_` を付与する
 */
export async function createExclamationAddedPath(
  path: string
): Promise<string> {
  const buf = path.split("/"); // TODO: どの文字で区切るかを環境に基づいて判定する
  const name = buf.pop();

  if (!name) {
    throw new Error("不正なパス");
  }

  let newName = "!" + name;
  let newPath = [...buf, newName].join("/");

  // 変更後のファイル名がすでに存在している場合、ファイル名と拡張子に分割し、ファイル名の末尾に `_` を付与してから結合して戻す
  while (await exists(newPath)) {
    const [n, e] = newName.split(".");
    newName = `${n}_.${e}`;
    newPath = [...buf, newName].join("/");
  }

  return newPath;
}

/**
 * パスから拡張子を取り除いたファイル名を返す
 */
export function getFileNameRemovedExtension(path: string): string {
  const name = path.split("/").pop(); // TODO: どの文字で区切るかを環境に基づいて判定する

  // ディレクトリのときなどは空文字列を返す
  if (!name) {
    return "";
  }

  const buf = name.split(".");

  // ファイル名がないとき(空文字列のとき)はそのまま返す
  if (buf.length === 0) {
    return name;
  }

  const ext = buf[buf.length - 1];

  // 拡張子部分が長い場合はそのまま返す（ピリオドが拡張子の区切りを表すものではないと判断）
  if (5 <= ext.length) {
    return name;
  }

  // 拡張子部分を除いて返す
  return name.split(".").slice(0, -1).join(".");
}
