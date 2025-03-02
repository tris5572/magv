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

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 外部公開 atom
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * アーカイブ（zip ファイル）を開く atom
 */
export const openZipAtom = atom(
  null,
  async (_, set, path: string | undefined) => {
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

    // 最初のページを表示
    set(moveIndexAtom, { index: 0 });
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
 *
 * @param index 開くインデックス
 * @param isForceSingle 強制的に1枚表示にするかどうかのフラグ
 */
const moveIndexAtom = atom(
  null,
  async (
    get,
    set,
    {
      index,
      isForceSingle = false,
    }: {
      index: number;
      isForceSingle?: boolean;
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

    // 強制的に1枚のみを表示する
    if (isForceSingle) {
      await convertData(zipData, name1);
      set(openZipDataAtom, zipData);
      set(openImagePathAtom, {
        type: "single",
        source: zipData[name1].blob,
      });
    }

    await convertData(zipData, name1);
    set(openZipDataAtom, zipData);

    // 1枚目が横長のときと、2枚目がないときは、1枚目のみを表示する
    if (zipData[name1].orientation === "landscape" || !name2) {
      set(openImagePathAtom, {
        type: "single",
        source: zipData[name1].blob,
      });
      return;
    }

    // 2枚目のデータを埋める
    await convertData(zipData, name2);
    set(openZipDataAtom, zipData);

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
    set(moveIndexAtom, { index: index - 1, isForceSingle: true });
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
  const imageData = get(openImagePathAtom);

  if (!zipData || !imageData) {
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
  set(openZipDataAtom, zipData);

  // 現在が縦画像を表示しているとき
  if (zipData[name0].orientation === "portrait") {
    // -1枚目が縦のときは、0枚目と-1枚目を表示する
    if (zipData[name1].orientation === "portrait") {
      set(openImagePathAtom, {
        type: "double",
        source1: zipData[name1].blob,
        source2: zipData[name0].blob,
      });
      set(openImageIndexAtom, index - 1);
      return;
    } else {
      // -1枚目が横のときは、-1枚目のみを表示する
      set(openImagePathAtom, {
        type: "single",
        source: zipData[name1].blob,
      });
      set(openImageIndexAtom, index - 1);
      return;
    }
  }

  await convertData(zipData, name2);
  set(openZipDataAtom, zipData);

  // 現在が横画像を表示しているとき

  // -1枚目と-2枚目が両方とも縦長のときは、2枚とも表示する
  if (
    zipData[name1].orientation === "portrait" &&
    zipData[name2].orientation === "portrait"
  ) {
    set(openImagePathAtom, {
      type: "double",
      source1: zipData[name2].blob,
      source2: zipData[name1].blob,
    });
    set(openImageIndexAtom, index - 2);
    return;
  }

  // それ以外のときは、-1枚目のみを表示する
  if (zipData[name1].orientation === "landscape") {
    set(openImagePathAtom, {
      type: "single",
      source: zipData[name1].blob,
    });
    set(openImageIndexAtom, index - 1);
    return;
  }
});

/**
 * 最初のページを表示する atom
 */
const moveFirstImageAtom = atom(null, async (get, set) => {
  const imageList = get(imageNameListAtom);
  const zipData = get(openZipDataAtom);
  const imageData = get(openImagePathAtom);

  if (!zipData || !imageData) {
    return;
  }

  const name1 = imageList[0];
  const name2 = imageList[1];

  if (!name1) {
    return;
  }

  // 1枚目のデータを埋める
  await convertData(zipData, name1);
  set(openZipDataAtom, zipData);

  // 1枚目が横長のときと、2枚目がないときは、1枚目のみを表示する
  // 「+1枚目が縦長ではない」という条件で、何らかの原因で縦横を取得できなかった場合に念の為対応している
  if (zipData[name1].orientation !== "portrait" || !name2) {
    set(openImagePathAtom, {
      type: "single",
      source: zipData[name1].blob,
    });
    set(openImageIndexAtom, 1);
    return;
  }

  // +2枚目のデータを埋める
  await convertData(zipData, name2);
  set(openZipDataAtom, zipData);

  // +1枚目と+2枚目が両方とも縦長のときは、2枚とも表示する
  if (
    zipData[name1].orientation === "portrait" &&
    zipData[name2].orientation === "portrait"
  ) {
    set(openImagePathAtom, {
      type: "double",
      source1: zipData[name1].blob,
      source2: zipData[name2].blob,
    });
    set(openImageIndexAtom, 1);
    return;
  }

  // +1枚目が縦長で+2枚目が横長のときは、+1枚目のみを表示する
  set(openImagePathAtom, {
    type: "single",
    source: zipData[name1].blob,
  });
  set(openImageIndexAtom, 1);
});

/**
 * 最後のページを表示する atom
 *
 * 最後の2枚が縦画像だったら2枚とも表示する
 */
const moveLastImageAtom = atom(null, async (get, set) => {
  const imageList = get(imageNameListAtom);
  const zipData = get(openZipDataAtom);
  const imageData = get(openImagePathAtom);

  if (!zipData || !imageData) {
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
    set(openImagePathAtom, {
      type: "double",
      source1: zipData[name1].blob,
      source2: zipData[name2].blob,
    });
    set(openImageIndexAtom, lastIndex - 1);
    return;
  }

  // 2枚目(最後の画像)が横長のとき、または2枚目が縦長で1枚目が横長のときは、2枚目のみを表示する
  set(openImagePathAtom, {
    type: "single",
    source: zipData[name1].blob,
  });
  set(openImageIndexAtom, lastIndex);
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
