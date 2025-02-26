import { atom } from "jotai";
import * as fflate from "fflate";
import { convertFileSrc } from "@tauri-apps/api/core";
import { openImagePathAtom } from "../states/image";
import { getImageOrientation } from "../utils/utils";

/**
 * 解凍した zip ファイルのデータ
 */
type ZipData = {
  /**
   * ファイル名のリスト
   */
  fileNames: string[];
  /**
   * 開いている画像がファイルの何番目か
   *
   * 2枚開いているときは、若い方の番号
   */
  openIndex: number;
  /**
   * 各ファイルのデータ
   */
  data: {
    /**
     * ファイル名
     */
    [name: string]: {
      /**
       * zip ファイルから取得したデータ
       */
      uint8: Uint8Array;
      /**
       * Base64 エンコードされたデータ。まだ変換されていない場合は undefined
       */
      base64?: string;
      /**
       * 画像の向き
       * - 縦向きの場合は "portrait"
       * - 横向きの場合は "landscape"
       * - 画像の向きが取得できなかった場合は `undefined`
       */
      orientation?: "portrait" | "landscape";
    };
  };
};

const openZipDataAtom = atom<ZipData | undefined>(undefined);

/**
 * zip ファイルを開く atom
 */
export const openZipAtom = atom(null, async (_, set, path: string) => {
  const response = await fetch(convertFileSrc(path));
  const arrayBuffer = await response.arrayBuffer();
  const unzipped = fflate.unzipSync(new Uint8Array(arrayBuffer));

  // zip ファイルの中身から不要なファイルを除外して画像ファイルだけに絞り込む
  const fileNames = Object.keys(unzipped)
    .filter((name) => !name.startsWith("__MACOSX/")) // Mac のリソースファイルを除く
    .filter((name) => !name.endsWith("/")) // ディレクトリを除く
    .filter((name) => /\.(jpe?g|png|gif|bmp|webp)$/i.test(name)) // 画像ファイルの拡張子を持つファイルだけを対象にする
    .sort();

  // データを生成して保持する
  const bufData: ZipData["data"] = fileNames.reduce((acc, name) => {
    acc[name] = { uint8: unzipped[name] };
    return acc;
  }, {} as ZipData["data"]);

  // ひとまず最初のファイルを表示する
  const name1 = fileNames[0];
  if (!name1) {
    return; // 1つもファイルがない場合は何もしない
  }

  const data1 = bufData[name1];
  const blob1 = new Blob([data1.uint8]);
  const base64_1 = await base64FromBlob(blob1);
  bufData[name1].base64 = base64_1;
  bufData[name1].orientation = await getImageOrientation(base64_1);

  const name2 = fileNames[1];
  if (!name2 || bufData[name1].orientation === "landscape") {
    // 1つしかファイルがない場合と1枚目が横長だった場合は、1つだけ表示する
    set(openImagePathAtom, { type: "single", path: bufData[name1].base64 });
    set(openZipDataAtom, { fileNames, openIndex: 0, data: bufData });
    return;
  }

  const data2 = bufData[name2];
  const blob2 = new Blob([data2.uint8]);
  const base64_2 = await base64FromBlob(blob2);
  bufData[name2].base64 = base64_2;
  bufData[name2].orientation = await getImageOrientation(base64_2);

  // 1枚目と2枚目が両方とも縦長だった場合は2枚表示する
  if (
    bufData[name1].orientation === "portrait" &&
    bufData[name2].orientation === "portrait"
  ) {
    set(openImagePathAtom, {
      type: "double",
      path1: bufData[name1].base64,
      path2: bufData[name2].base64,
    });
    set(openZipDataAtom, { fileNames, openIndex: 1, data: bufData });
    return;
  }

  // 1枚目が縦長で2枚目が横長だった場合は1枚目だけ表示する
  set(openImagePathAtom, { type: "single", path: bufData[name1].base64 });
  set(openZipDataAtom, { fileNames, openIndex: 0, data: bufData });
});

/**
 * キーボード操作を処理する atom
 */
export const handleKeyEventAtom = atom(
  null,
  async (_, set, event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      set(nextImageAtom);
    }
  }
);

// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
// イベント系
// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

/**
 * 次の画像を表示する
 *
 * 見開き表示可能な場合は見開き表示にする
 */
const nextImageAtom = atom(null, async (get, set) => {
  const zipData = get(openZipDataAtom);
  const imageData = get(openImagePathAtom);

  if (!zipData || !imageData) {
    return;
  }

  // 基準のインデックスとして、1枚表示時は現在表示している画像に、2枚表示時は2枚目の画像にする
  const index =
    imageData.type === "single" ? zipData.openIndex : zipData.openIndex + 1;

  // 次の画像が存在しない場合は何もしない
  if (zipData.fileNames.length <= index) {
    return;
  }

  const name1 = zipData.fileNames[index + 1];
  const name2 = zipData.fileNames[index + 2];

  if (!name1) {
    return;
  }

  // +1枚目のデータを埋める
  if (!zipData.data[name1].base64) {
    const data = zipData.data[name1];
    const blob = new Blob([data.uint8]);
    const base64 = await base64FromBlob(blob);
    zipData.data[name1].base64 = base64;
    zipData.data[name1].orientation = await getImageOrientation(base64);
  }

  // +1枚目が横長のときと、+2枚目がないときは、+1枚目のみを表示する
  // 「+1枚目が縦長ではない」という条件で、何らかの原因で縦横を取得できなかった場合に念の為対応している
  if (zipData.data[name1].orientation !== "portrait" || !name2) {
    set(openImagePathAtom, {
      type: "single",
      path: zipData.data[name1].base64,
    });
    zipData.openIndex = index + 1;
    set(openZipDataAtom, zipData);
    return;
  }

  // +2枚目のデータを埋める
  if (!zipData.data[name2].base64) {
    const data = zipData.data[name2];
    const blob = new Blob([data.uint8]);
    const base64 = await base64FromBlob(blob);
    zipData.data[name2].base64 = base64;
    zipData.data[name2].orientation = await getImageOrientation(base64);
  }

  // +1枚目と+2枚目が両方とも縦長のときは、2枚とも表示する
  if (
    zipData.data[name1].orientation === "portrait" &&
    zipData.data[name2].orientation === "portrait"
  ) {
    set(openImagePathAtom, {
      type: "double",
      path1: zipData.data[name1].base64,
      path2: zipData.data[name2].base64,
    });
    zipData.openIndex = index + 2;
    set(openZipDataAtom, zipData);
    return;
  }

  // +1枚目が縦長で+2枚目が横長のときは、+1枚目のみを表示する
  set(openImagePathAtom, {
    type: "single",
    path: zipData.data[name1].base64,
  });
  zipData.openIndex = index + 1;
  set(openZipDataAtom, zipData);
});

// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
// ユーティリティ
// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

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
