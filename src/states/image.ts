import { atom, useAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";

// 画像ファイルを開いたときの状態を管理する

// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
// データ保持用 atom
// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

// 現在開いているディレクトリのパス
// const openDirPathAtom = atom<string | undefined>(undefined);

// 現在開いているディレクトリ内にある画像ファイルのパスのリスト
const imagePathsAtom = atom<string[]>([]);

// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
// 外部公開 atom
// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

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
    set(imagePathsAtom, fileList);
  } else {
    // 画像以外がドロップされたときは、当該フォルダの中の先頭の画像を表示する
    // 画像ファイルがない場合は何もしない
    if (fileList.length > 0) {
      set(openImagePathAtom, fileList[0]);
      set(imagePathsAtom, fileList);
    }
  }
});

// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
// イベント系

/**
 * キーボードイベントを処理する関数を返す
 */
export function useKeyboardEvent(): (event: KeyboardEvent) => void {
  const [, nextImage] = useAtom(nextImageAtom);
  const [, prevImage] = useAtom(prevImageAtom);

  return (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      nextImage();
    } else if (event.key === "ArrowLeft") {
      prevImage();
    }
  };
}

/**
 * 次の画像を表示する
 */
export const nextImageAtom = atom(null, async (get, set) => {
  const imagePaths = get(imagePathsAtom);
  const currentImagePath = get(openImagePathAtom);

  const currentIndex = imagePaths.findIndex(
    (path) => path === currentImagePath
  );
  const nextIndex = currentIndex + 1;

  if (nextIndex < imagePaths.length) {
    set(openImagePathAtom, imagePaths[nextIndex]);
  }
});

/**
 * 前の画像を表示する
 */
export const prevImageAtom = atom(null, async (get, set) => {
  const imagePaths = get(imagePathsAtom);
  const currentImagePath = get(openImagePathAtom);

  const currentIndex = imagePaths.findIndex(
    (path) => path === currentImagePath
  );
  const prevIndex = currentIndex - 1;

  if (prevIndex >= 0) {
    set(openImagePathAtom, imagePaths[prevIndex]);
  }
});
