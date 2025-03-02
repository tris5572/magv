import { atom } from "jotai";
import * as fflate from "fflate";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openImagePathAtom } from "../states/image";
import { getImageOrientation } from "../utils/utils";

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
 */
const imageNameListAtom = atom<string[]>([]);

/**
 * 表示している画像ファイルのインデックスを保持する atom
 *
 * 2枚表示時は若い方のインデックス
 */
const openImageIndexAtom = atom<number>(0);

/**
 * 現在開いているアーカイブファイルのパスを保持する atom
 *
 * 何も開いていない初期状態では `undefined`
 */
const openArchivePathAtom = atom<string | undefined>();

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
    set(updateArchiveListAtom, path);
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

    // 当該アーカイブを最後に開いていたときのインデックスを取得
    // 初めて開く場合は 0
    const index = get(lastOpenIndexAtom);

    // ページを表示
    set(moveIndexAtom, { index });
  }
);

/**
 * キーボード操作を処理する atom
 */
export const handleKeyEventAtom = atom(
  null,
  async (_, set, event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      if (event.shiftKey) {
        set(moveNextSingleImageAtom);
      } else {
        set(nextImageAtom);
      }
    } else if (event.key === "ArrowRight") {
      if (event.shiftKey) {
        set(movePrevSingleImageAtom);
      } else {
        set(prevImageAtom);
      }
    } else if (event.key === " ") {
      if (event.shiftKey) {
        set(prevImageAtom);
      } else {
        set(nextImageAtom);
      }
    } else if (event.key === "ArrowDown") {
      set(openNextArchiveAtom);
    } else if (event.key === "ArrowUp") {
      set(openPrevArchiveAtom);
    } else if (event.key === "End") {
      set(moveFirstImageAtom);
    } else if (event.key === "Home") {
      set(moveLastImageAtom);
    }
  }
);

/**
 * マウスホイールのイベントを処理する atom
 */
export const handleMouseWheelEventAtom = atom(
  null,
  async (_, set, event: WheelEvent) => {
    if (0 < event.deltaY) {
      set(nextImageAtom);
    } else if (event.deltaY < 0) {
      set(prevImageAtom);
    }
  }
);

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region ページ移動系
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * 指定したインデックスのページへ移動する atom
 */
const moveIndexAtom = atom(
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
      set(openImagePathAtom, {
        type: "single",
        source: zipData[name1].blob,
      });
    }

    await convertData(zipData, name1);
    await convertData(zipData, name2);
    set(openZipDataAtom, zipData);

    // 1枚目が横長のときと、2枚目がないときは、1枚目のみを表示する
    if (zipData[name1].orientation === "landscape" || !name2) {
      set(openImagePathAtom, {
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
      set(openImagePathAtom, {
        type: "double",
        source1: zipData[name1].blob,
        source2: zipData[name2].blob,
      });
      return;
    }

    // 1枚目が縦長で2枚目が横長のときは、1枚目のみを表示する
    set(openImagePathAtom, {
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
const nextImageAtom = atom(null, async (get, set) => {
  const openIndex = get(openImageIndexAtom);
  const imageData = get(openImagePathAtom);

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
const prevImageAtom = atom(null, async (get, set) => {
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
 */
const moveNextSingleImageAtom = atom(null, async (get, set) => {
  const imageList = get(imageNameListAtom);
  const index = get(openImageIndexAtom);
  const imageProperty = get(openImagePathAtom);

  if (!imageProperty) {
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
 */
const moveFirstImageAtom = atom(null, async (_, set) => {
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
 */
const updateArchiveListAtom = atom(null, async (_, set, path: string) => {
  const fileList = (await invoke("get_archive_file_list", {
    path,
  })) as string[];
  fileList.sort((a, b) => a.localeCompare(b, [], { numeric: true }));
  set(archivePathListAtom, fileList);
});

/**
 * 次のアーカイブファイルを開く
 */
const openNextArchiveAtom = atom(null, async (get, set) => {
  const archiveList = get(archivePathListAtom);
  const nowPath = get(openArchivePathAtom);

  // 現在のファイルのインデックスを探す
  const index = archiveList.findIndex((path) => path === nowPath);

  // 現在のファイルと一致するものがなかったときは、フォルダ内の最初のファイルを開く
  if (index === -1) {
    const path = archiveList[0];
    if (path) {
      set(openZipAtom, path);
    }
  }

  const path = archiveList[index + 1];
  if (path) {
    set(openZipAtom, path);
  }
});

/**
 * 前のアーカイブファイルを開く
 */
const openPrevArchiveAtom = atom(null, async (get, set) => {
  const archiveList = get(archivePathListAtom);
  const nowPath = get(openArchivePathAtom);

  // 現在のファイルのインデックスを探す
  const index = archiveList.findIndex((path) => path === nowPath);

  // 現在のファイルと一致するものがなかったときは、フォルダ内の最初のファイルを開く
  // TODO: このときの挙動はどうなっているべきか見直す
  if (index === -1) {
    const path = archiveList[0];
    if (path) {
      set(openZipAtom, path);
    }
  }

  const path = archiveList[index - 1];
  set(openZipAtom, path);
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
