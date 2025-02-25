import { atom } from "jotai";
import * as fflate from "fflate";
import { convertFileSrc } from "@tauri-apps/api/core";
import { openImagePathAtom } from "../states/image";
import { getImageOrientation } from "../utils/utils";

type ZipData = {
  /**
   * ファイル名のリスト
   */
  fileNames: string[];
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
    .filter((name) => /\.(jpe?g|png|gif|bmp|webp)$/i.test(name)); // 画像ファイルの拡張子を持つファイルだけを対象にする

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
    set(openZipDataAtom, { fileNames, data: bufData });
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
    set(openZipDataAtom, { fileNames, data: bufData });
    return;
  }

  // 1枚目が縦長で2枚目が横長だった場合は1枚目だけ表示する
  set(openImagePathAtom, { type: "single", path: bufData[name1].base64 });
  set(openZipDataAtom, { fileNames, data: bufData });
});

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
