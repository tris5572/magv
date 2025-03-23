import { atom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { getImageOrientation } from "../utils/utils";
import { appModeAtom, singleOrDoubleAtom, viewingImageAtom } from "./app";
import { AppEvent } from "../types/event";

// 画像ファイルを開いたときの状態を管理する

// =============================================================================
// データ保持用 atom
// =============================================================================

// 現在開いているディレクトリのパス
// const openDirPathAtom = atom<string | undefined>(undefined);

/** 対象のディレクトリ内にある画像ファイルのパスのリストの atom */
const $imagePathListAtom = atom<string[]>([]);

/** 開いている画像のインデックスを示す atom */
const $openingIndexAtom = atom<number>(0);

// =============================================================================
// 外部公開 atom
// =============================================================================

// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
// #region 開く系
// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

/**
 * パスとして指定された画像ファイルを開く
 */
export const openImagePathAtom = atom(null, async (_, set, path: string) => {
  // 画像ファイルの一覧を取得する
  const fileList = (await invoke("get_image_file_list", {
    path,
  })) as string[];

  // ディレクトリ内に画像ファイルがない場合は何もしない
  if (fileList.length === 0) {
    return;
  }

  set($imagePathListAtom, fileList);
  set(appModeAtom, "image");

  const index = fileList.findIndex((file) => file === path);

  // パスで指定された画像ファイルが見付かった場合はそれを、見付からなかった場合はディレクトリ内の先頭の画像を表示する
  if (index !== -1) {
    set(moveIndexAtom, { index });
  } else {
    set(moveIndexAtom, { index: 0 });
  }
});

/**
 * パスとして指定されたディレクトリの先頭画像を表示する
 *
 * ディレクトリ内に画像ファイルがない場合は何もしない
 */
export const openDirectoryPathAtom = atom(null, async (_, set, path: string) => {
  // ディレクトリ内の画像ファイルの一覧を取得する
  const fileList = (await invoke("get_image_file_list", {
    path,
  })) as string[];

  // ディレクトリ内に画像ファイルがない場合は何もしない
  if (fileList.length === 0) {
    return;
  }

  set(appModeAtom, "image");
  set($imagePathListAtom, fileList);
  set(moveIndexAtom, { index: 0 });
});

// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
// イベント系

/**
 * 操作イベントを処理する atom
 */
export const handleAppEvent = atom(
  null,
  async (get, set, event: AppEvent | { event: AppEvent; payload: number | string }) => {
    const singleOrDouble = get(singleOrDoubleAtom);

    // if (typeof event === "object") {
    //   if (event.event === AppEvent.RENAME_ARCHIVE) {
    //     set(renameArchiveAtom, String(event.payload));
    //   }
    //   return;
    // }

    switch (event) {
      case AppEvent.MOVE_NEXT_PAGE: {
        if (singleOrDouble === "single") {
          set(moveNextSingleImageAtom);
          break;
        }
        set(moveNextPageAtom);
        break;
      }
      case AppEvent.MOVE_PREV_PAGE: {
        if (singleOrDouble === "single") {
          set(movePrevSingleImageAtom);
          break;
        }
        set(movePrevPageAtom);
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
        set(moveFirstPageAtom);
        break;
      }
      case AppEvent.MOVE_LAST_PAGE: {
        set(moveLastPageAtom);
        break;
      }
      //   case AppEvent.SWITCH_NEXT_ARCHIVE: {
      //     set(openNextArchiveAtom);
      //     break;
      //   }
      //   case AppEvent.SWITCH_PREV_ARCHIVE: {
      //     set(openPrevArchiveAtom);
      //     break;
      //   }
      //   case AppEvent.ADD_EXCLAMATION_MARK: {
      //     set(renameAddExclamationMarkAtom);
      //     break;
      //   }
      //   case AppEvent.SEARCH_FILE_NAME: {
      //     searchAtBrowser(get(openingArchivePathWithoutExtension));
      //     break;
      //   }
      //   case AppEvent.UPDATE_PAGE: {
      //     set(updatePageAtom);
      //     break;
      //   }
    }
  }
);

/**
 * 指定したインデックスへ移動する atom
 *
 * 指定インデックスと次の画像が両方とも縦のときは見開き表示する
 *
 * ただし `forceSingle` が `true` のときは強制的に1枚のみ表示する
 */
export const moveIndexAtom = atom(
  null,
  async (get, set, { index, forceSingle }: { index: number; forceSingle?: boolean }) => {
    const fileList = get($imagePathListAtom);
    const singleOrDouble = get(singleOrDoubleAtom);

    const path1 = fileList[index];
    const path2 = fileList[index + 1];

    if (!path1) {
      return;
    }

    set($openingIndexAtom, index);

    if (forceSingle || singleOrDouble === "single") {
      set(viewingImageAtom, { type: "single", source: path1 });
      return;
    }

    const orientation1 = await getImageOrientation(path1);

    if (orientation1 === "landscape" || !path2) {
      set(viewingImageAtom, { type: "single", source: path1 });
      return;
    }

    const orientation2 = await getImageOrientation(path2);

    if (orientation2 === "portrait") {
      set(viewingImageAtom, {
        type: "double",
        source1: path1,
        source2: path2,
      });
      return;
    }

    set($openingIndexAtom, index);
    set(viewingImageAtom, { type: "single", source: path1 });
  }
);

/**
 * 次のページへ移動する atom
 */
const moveNextPageAtom = atom(null, async (get, set) => {
  const viewingImage = get(viewingImageAtom);
  const openingIndex = get($openingIndexAtom);

  if (!viewingImage) {
    return;
  }

  const index = openingIndex + (viewingImage.type === "single" ? 1 : 2);

  set(moveIndexAtom, { index });
});

/**
 * 前のページへ移動する atom
 *
 * 前のページに相当する画像の縦横を元に、表示する枚数を判定する
 *
 * 現在表示している画像は重複して表示しないのが基本。したがって縦画像が1枚だけ表示されるケースもあり得る。
 *
 * 右開きで右に戻るときの動作は以下の表の通り。「0枚目」は表示中の若い方を指す。
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
const movePrevPageAtom = atom(null, async (get, set) => {
  const fileList = get($imagePathListAtom);
  const index = get($openingIndexAtom);

  const path0 = fileList[index];
  const path1 = fileList[index - 1];
  const path2 = fileList[index - 2];

  // 現在のページと前のページが存在しない場合は何もしない
  if (!path0 || !path1) {
    return;
  }

  const orientation1 = await getImageOrientation(path1);
  const orientation2 = await getImageOrientation(path2);

  // -1枚目が横のとき、-1枚目が最初の画像のとき(-2枚目がなかったとき)、-2枚目が横だったときは、1枚だけ戻って-1枚目のみを表示する
  if (orientation1 === "landscape" || !path2 || orientation2 === "landscape") {
    set(moveIndexAtom, { index: index - 1, forceSingle: true });
    return;
  }

  // -1枚目と-2枚目が両方とも縦長なので、見開き表示する
  set(moveIndexAtom, { index: index - 2 });
});

/**
 * 1枚だけ次の画像へ移動する atom
 */
const moveNextSingleImageAtom = atom(null, async (get, set) => {
  const openingIndex = get($openingIndexAtom);

  set(moveIndexAtom, { index: openingIndex + 1 });
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
  const fileList = get($imagePathListAtom);
  const index = get($openingIndexAtom);

  const path0 = fileList[index];
  const path1 = fileList[index - 1];
  const path2 = fileList[index - 2];

  // 現在のページと前のページが存在しない場合は何もしない
  if (!path0 || !path1) {
    return;
  }

  const orientation0 = await getImageOrientation(path0);
  const orientation1 = await getImageOrientation(path1);
  const orientation2 = await getImageOrientation(path2);

  // 現在、横画像を表示していて、-1枚目と-2枚目が両方とも縦のときは、2枚戻って見開き表示する
  if (
    orientation0 === "landscape" &&
    path2 &&
    orientation1 === "portrait" &&
    orientation2 === "portrait"
  ) {
    set(moveIndexAtom, { index: index - 2 });
    return;
  }

  // それ以外のときは、-1枚目のみを基準に表示する (見開き判定は表示処理で実施)
  set(moveIndexAtom, { index: index - 1 });
});

/**
 * 最初のページへ移動する atom
 */
const moveFirstPageAtom = atom(null, async (_, set) => {
  set(moveIndexAtom, { index: 0 });
});

/**
 * 最後のページへ移動する atom
 *
 * 最後の2枚が縦画像だったら見開き表示する
 */
const moveLastPageAtom = atom(null, async (get, set) => {
  const fileList = get($imagePathListAtom);
  const lastIndex = fileList.length - 1;
  const path1 = fileList[lastIndex - 1]; // 最後の1つ手前
  const path2 = fileList[lastIndex]; // 最後

  const orientation1 = await getImageOrientation(path1);
  const orientation2 = await getImageOrientation(path2);

  // 1枚目と2枚目の両方が縦長のときは、2枚とも表示する
  if (orientation1 === "portrait" && orientation2 === "portrait") {
    set(moveIndexAtom, { index: lastIndex - 1 });
    return;
  }

  // その他のときは最後の画像のみを表示する
  set(moveIndexAtom, { index: lastIndex });
});

/**
 * 次の画像を表示する atom
 */
// const nextImageAtom = atom(null, async (get, set) => {
//   const imagePaths = get(imagePathsAtom);
//   const currentImagePath = get(viewingImageAtom);

//   // インデックス検索の対象として、1枚表示時は現在表示している画像に、2枚表示時は2枚目の画像にする
//   const path =
//     currentImagePath?.type === "single" ? currentImagePath?.source : currentImagePath?.source2;

//   const currentIndex = imagePaths.findIndex((p) => p === path);

//   // 2つ先の画像までの縦横の向きを取得
//   const orientation1 = await getImageOrientation(imagePaths[currentIndex + 1] ?? "");
//   const orientation2 = await getImageOrientation(imagePaths[currentIndex + 2] ?? "");

//   // 1枚目がないときは何もしない
//   if (orientation1 === undefined) {
//     return;
//   }
//   // 1枚目が縦長のとき、2枚目がないとき、あるいは2枚目が横長のときは、1枚目のみを表示する
//   if (orientation1 === "landscape" || orientation2 === undefined || orientation2 === "landscape") {
//     set(viewingImageAtom, {
//       type: "single",
//       source: imagePaths[currentIndex + 1],
//     });
//     return;
//   }
//   // 2枚とも縦長の画像だったときは、2枚表示にする
//   set(viewingImageAtom, {
//     type: "double",
//     source1: imagePaths[currentIndex + 1],
//     source2: imagePaths[currentIndex + 2],
//   });
// });

/**
 * 前の画像を表示する atom
 */
// export const prevImageAtom = atom(null, async (get, set) => {
//   const imagePaths = get(imagePathsAtom);
//   const currentImagePath = get(viewingImageAtom);

//   // インデックス検索の対象として、1枚表示時は現在表示している画像に、2枚表示時も1枚目の画像にする
//   const path =
//     currentImagePath?.type === "single" ? currentImagePath?.source : currentImagePath?.source1;
//   const currentIndex = imagePaths.findIndex((p) => p === path);

//   // 2つ前の画像までの縦横の向きを取得
//   const orientation1 = await getImageOrientation(imagePaths[currentIndex - 1] ?? "");
//   const orientation2 = await getImageOrientation(imagePaths[currentIndex - 2] ?? "");

//   // 1枚目がないときは何もしない
//   if (orientation1 === undefined) {
//     return;
//   }
//   // 1枚目が縦長のとき、2枚目がないとき、あるいは2枚目が横長のときは、1枚目のみを表示する
//   if (orientation1 === "landscape" || orientation2 === undefined || orientation2 === "landscape") {
//     set(viewingImageAtom, {
//       type: "single",
//       source: imagePaths[currentIndex - 1],
//     });
//     return;
//   }
//   // 2枚とも縦長の画像だったときは、2枚表示にする
//   set(viewingImageAtom, {
//     type: "double",
//     source1: imagePaths[currentIndex - 2], // 2つ前の画像が1枚目
//     source2: imagePaths[currentIndex - 1],
//   });
// });

/**
 * 現在開いている画像のフォルダ内でのインデックスを返す atom
 */
export const openingImageIndexAtom = atom((get) => {
  return get($openingIndexAtom);
});

/**
 * 現在開いているフォルダ内の画像ファイルのリストを返す atom
 */
export const imageListAtom = atom((get) => {
  return get($imagePathListAtom);
});
