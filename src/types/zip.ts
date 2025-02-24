import { atom } from "jotai";
import * as fflate from "fflate";
import { convertFileSrc } from "@tauri-apps/api/core";
import { openImagePathAtom } from "../states/image";

// const openZipData = atom<Unzipped | undefined>(undefined);

/**
 * zip ファイルを開く atom
 */
export const openZipAtom = atom(null, async (_, set, path: string) => {
  const response = await fetch(convertFileSrc(path));
  const arrayBuffer = await response.arrayBuffer();
  const unzipped = fflate.unzipSync(new Uint8Array(arrayBuffer));

  const fileNames = Object.keys(unzipped)
    .filter((name) => !name.startsWith("__MACOSX/")) // Mac のリソースファイルを除く
    .filter((name) => !name.endsWith("/")); // ディレクトリを除く

  // ひとまず最初のファイルを表示する
  const imageData = unzipped[fileNames[0]];
  const blob = new Blob([imageData]);
  const base64 = await base64FromBlob(blob);
  set(openImagePathAtom, { type: "single", path: base64 });
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
