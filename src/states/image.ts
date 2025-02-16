import { atom } from "jotai";
import { invoke } from "@tauri-apps/api/core";

// 画像ファイルを開いたときの状態を管理する

// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
// データ保持用 atom
// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

// 現在開いているディレクトリのパス
// const openDirPathAtom = atom<string | undefined>(undefined);

// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
// 外部公開 atom
// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

// 現在開いているディレクトリ内にある画像ファイルのパスのリスト
// const imagePathsAtom = atom<string[]>([]);

/** 現在開いている画像ファイルのパス */
export const openImagePathAtom = atom<string | undefined>(undefined);

/**
 * 開くパスを指定する
 *
 * パスが画像のときはそのまま表示し、フォルダだったりした場合は戦闘の画像を表示する
 */
export const openPathAtom = atom(null, async (_, set, path: string) => {
  // 画像ファイルの一覧を取得する
  const fileList = (await invoke("get_image_file_list", {
    path,
  })) as string[];

  if (fileList.find((file) => file === path)) {
    // ドロップされたファイルが画像だったときは、そのまま表示する
    set(openImagePathAtom, path);
  } else {
    // 画像以外がドロップされたときは、当該フォルダの中の先頭の画像を表示する
    // 画像ファイルがない場合は何もしない
    if (fileList.length > 0) {
      set(openImagePathAtom, fileList[0]);
    }
  }
});
