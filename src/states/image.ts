import { atom, useAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { ViewImageMode } from "../types/image";
import { getImageOrientation } from "../utils/utils";

// 画像ファイルを開いたときの状態を管理する

// =============================================================================
// データ保持用 atom
// =============================================================================

// 現在開いているディレクトリのパス
// const openDirPathAtom = atom<string | undefined>(undefined);

// 現在開いているディレクトリ内にある画像ファイルのパスのリスト
const imagePathsAtom = atom<string[]>([]);

// =============================================================================
// 外部公開 atom
// =============================================================================

/** 現在開いている画像ファイルのパス */
export const openImagePathAtom = atom<ViewImageMode | undefined>(undefined);

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
    // TODO: 縦横判定を行う
    set(openImagePathAtom, { type: "single", source: path });
    set(imagePathsAtom, fileList);
  } else {
    // 画像以外がドロップされたときは、当該フォルダの中の先頭の画像を表示する
    // 画像ファイルがない場合は何もしない
    if (fileList.length > 0) {
      set(openImagePathAtom, { type: "single", source: fileList[0] });
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
 * 次の画像を表示する atom
 */
const nextImageAtom = atom(null, async (get, set) => {
  const imagePaths = get(imagePathsAtom);
  const currentImagePath = get(openImagePathAtom);

  // インデックス検索の対象として、1枚表示時は現在表示している画像に、2枚表示時は2枚目の画像にする
  const path =
    currentImagePath?.type === "single"
      ? currentImagePath?.source
      : currentImagePath?.source2;

  const currentIndex = imagePaths.findIndex((p) => p === path);

  // 2つ先の画像までの縦横の向きを取得
  const orientation1 = await getImageOrientation(
    imagePaths[currentIndex + 1] ?? ""
  );
  const orientation2 = await getImageOrientation(
    imagePaths[currentIndex + 2] ?? ""
  );

  // 1枚目がないときは何もしない
  if (orientation1 === undefined) {
    return;
  }
  // 1枚目が縦長のとき、2枚目がないとき、あるいは2枚目が横長のときは、1枚目のみを表示する
  if (
    orientation1 === "landscape" ||
    orientation2 === undefined ||
    orientation2 === "landscape"
  ) {
    set(openImagePathAtom, {
      type: "single",
      source: imagePaths[currentIndex + 1],
    });
    return;
  }
  // 2枚とも縦長の画像だったときは、2枚表示にする
  set(openImagePathAtom, {
    type: "double",
    source1: imagePaths[currentIndex + 1],
    source2: imagePaths[currentIndex + 2],
  });
});

/**
 * 前の画像を表示する atom
 */
export const prevImageAtom = atom(null, async (get, set) => {
  const imagePaths = get(imagePathsAtom);
  const currentImagePath = get(openImagePathAtom);

  // インデックス検索の対象として、1枚表示時は現在表示している画像に、2枚表示時も1枚目の画像にする
  const path =
    currentImagePath?.type === "single"
      ? currentImagePath?.source
      : currentImagePath?.source1;
  const currentIndex = imagePaths.findIndex((p) => p === path);

  // 2つ前の画像までの縦横の向きを取得
  const orientation1 = await getImageOrientation(
    imagePaths[currentIndex - 1] ?? ""
  );
  const orientation2 = await getImageOrientation(
    imagePaths[currentIndex - 2] ?? ""
  );

  // 1枚目がないときは何もしない
  if (orientation1 === undefined) {
    return;
  }
  // 1枚目が縦長のとき、2枚目がないとき、あるいは2枚目が横長のときは、1枚目のみを表示する
  if (
    orientation1 === "landscape" ||
    orientation2 === undefined ||
    orientation2 === "landscape"
  ) {
    set(openImagePathAtom, {
      type: "single",
      source: imagePaths[currentIndex - 1],
    });
    return;
  }
  // 2枚とも縦長の画像だったときは、2枚表示にする
  set(openImagePathAtom, {
    type: "double",
    source1: imagePaths[currentIndex - 2], // 2つ前の画像が1枚目
    source2: imagePaths[currentIndex - 1],
  });
});
