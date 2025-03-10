export const AppEvent = {
  /** 次のページへ移動する */
  MOVE_NEXT_PAGE: "MOVE_NEXT_PAGE",
  /** 前のページへ移動する */
  MOVE_PREV_PAGE: "MOVE_PREV_PAGE",
  /** 1枚だけ次の画像へ移動する */
  MOVE_NEXT_SINGLE_IMAGE: "MOVE_NEXT_SINGLE_IMAGE",
  /** 1枚だけ前の画像へ移動する */
  MOVE_PREV_SINGLE_IMAGE: "MOVE_PREV_SINGLE_IMAGE",
  /** 最初の画像へ移動する */
  MOVE_FIRST_PAGE: "MOVE_FIRST_PAGE",
  /** 最後の画像へ移動する */
  MOVE_LAST_PAGE: "MOVE_LAST_PAGE",
  /** 次のアーカイブファイルへ切り替える */
  SWITCH_NEXT_ARCHIVE: "SWITCH_NEXT_ARCHIVE",
  /** 前のアーカイブファイルへ切り替える */
  SWITCH_PREV_ARCHIVE: "SWITCH_PREV_ARCHIVE",
  /** ファイル名の先頭にビックリマークを付与する */
  ADD_EXCLAMATION_MARK: "ADD_EXCLAMATION_MARK",
  /** リネーム入力ビューを表示する */
  OPEN_RENAME_VIEW: "OPEN_RENAME_VIEW",
  /** リネーム入力ビューを閉じる */
  CLOSE_RENAME_VIEW: "CLOSE_RENAME_VIEW",
  /** アーカイブファイルをリネームする */
  RENAME_ARCHIVE: "RENAME_ARCHIVE",
  /** ファイル名で検索する */
  SEARCH_FILE_NAME: "SEARCH_FILE_NAME",
} as const;

/**
 * アプリケーションで発生するイベント
 */
export type AppEvent = (typeof AppEvent)[keyof typeof AppEvent];
