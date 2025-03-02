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
// 内部データ保持 atom
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
// 外部公開 atom
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

    set(openImageIndexAtom, 0);

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

    // 最初のファイルを表示する
    const name1 = fileNames[0];
    // 1つも画像ファイルがない場合は何もしない
    if (!name1) {
      return;
    }

    await convertData(bufData, name1);
    set(openZipDataAtom, bufData);

    const name2 = fileNames[1];
    // 1つしかファイルがない場合と1枚目が横長だった場合は、1つだけ表示する
    if (!name2 || bufData[name1].orientation === "landscape") {
      set(openImagePathAtom, { type: "single", source: bufData[name1].blob });
      return;
    }

    await convertData(bufData, name2);
    set(openZipDataAtom, bufData);

    // 1枚目と2枚目が両方とも縦長だった場合は2枚表示する
    if (
      bufData[name1].orientation === "portrait" &&
      bufData[name2].orientation === "portrait"
    ) {
      set(openImagePathAtom, {
        type: "double",
        source1: bufData[name1].blob,
        source2: bufData[name2].blob,
      });
      return;
    }

    // 1枚目が縦長で2枚目が横長だった場合は1枚目だけ表示する
    set(openImagePathAtom, { type: "single", source: bufData[name1].blob });
  }
);

/**
 * キーボード操作を処理する atom
 */
export const handleKeyEventAtom = atom(
  null,
  async (_, set, event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      set(nextImageAtom);
    } else if (event.key === "ArrowRight") {
      set(prevImageAtom);
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

// -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -
// イベント系
// -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -    -

/**
 * 次の画像（ページ）を表示する atom
 *
 * 見開き表示に対応している
 */
const nextImageAtom = atom(null, async (get, set) => {
  const imageList = get(imageNameListAtom);
  const openIndex = get(openImageIndexAtom);
  const zipData = get(openZipDataAtom);
  const imageData = get(openImagePathAtom);

  if (!zipData || !imageData) {
    return;
  }

  // 基準のインデックスとして、1枚表示時は現在表示している画像に、2枚表示時は2枚目の画像にする
  const index = imageData.type === "single" ? openIndex : openIndex + 1;

  // 次の画像が存在しない場合は何もしない
  if (imageList.length <= index) {
    return;
  }

  const name1 = imageList[index + 1];
  const name2 = imageList[index + 2];

  if (!name1) {
    return;
  }

  // +1枚目のデータを埋める
  await convertData(zipData, name1);
  set(openZipDataAtom, zipData);

  // +1枚目が横長のときと、+2枚目がないときは、+1枚目のみを表示する
  // 「+1枚目が縦長ではない」という条件で、何らかの原因で縦横を取得できなかった場合に念の為対応している
  if (zipData[name1].orientation !== "portrait" || !name2) {
    set(openImagePathAtom, {
      type: "single",
      source: zipData[name1].blob,
    });
    set(openImageIndexAtom, index + 1);
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
    set(openImageIndexAtom, index + 1); // 上で計算のためにすでに +1 しているため +1 のみ
    return;
  }

  // +1枚目が縦長で+2枚目が横長のときは、+1枚目のみを表示する
  set(openImagePathAtom, {
    type: "single",
    source: zipData[name1].blob,
  });
  set(openImageIndexAtom, index + 1);
});

/**
 * 前の画像（ページ）を表示する atom
 *
 * 見開き表示に対応している
 */
const prevImageAtom = atom(null, async (get, set) => {
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

  // -1枚目のデータを埋める
  await convertData(zipData, name1);
  set(openZipDataAtom, zipData);

  // -1枚目が最初の画像で、0枚目と-1枚目が両方とも縦長のときは、それらを2枚とも表示する
  if (
    index === 1 &&
    zipData[name0].orientation === "portrait" &&
    zipData[name1].orientation === "portrait"
  ) {
    set(openImagePathAtom, {
      type: "double",
      source1: zipData[name1].blob,
      source2: zipData[name0].blob,
    });
    set(openImageIndexAtom, 0);
    return;
  }

  // -1枚目が横長のときと、-2枚目がないときは、-1枚目のみを表示する
  // 「-1枚目が縦長ではない」という条件で、何らかの原因で縦横を取得できなかった場合に念の為対応している
  if (zipData[name1].orientation !== "portrait" || !name2) {
    set(openImagePathAtom, {
      type: "single",
      source: zipData[name1].blob,
    });
    set(openImageIndexAtom, index - 1);
    return;
  }

  // -2枚目のデータを埋める
  await convertData(zipData, name2);
  set(openZipDataAtom, zipData);

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

  // -1枚目が縦長で-2枚目が横長のときは、-1枚目のみを表示する
  set(openImagePathAtom, {
    type: "single",
    source: zipData[name1].blob,
  });
  set(openImageIndexAtom, index - 1);
});

/**
 * 最初の画像（ページ）を表示する atom
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
 * 最後の画像（ページ）を表示する atom
 *
 * 見開き表示に対応している
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
// アーカイブ操作系
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
// ユーティリティ
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * データを変換する
 *
 * 現状では画像の向きの取得のみを行う
 *
 * 基本的に、この関数を呼び出したときは await して終了を待つ必要がある
 */
async function convertData(target: ZipData, fileName: string) {
  if (!target[fileName].orientation) {
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
