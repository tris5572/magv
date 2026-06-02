import { AppEvent } from "../types/event";

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 左右操作反転
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * 左右操作反転時にペアとして扱うイベント
 */
const HORIZONTAL_SWITCH_PAIR: [AppEvent, AppEvent][] = [
  [AppEvent.MOVE_NEXT_PAGE, AppEvent.MOVE_PREV_PAGE],
  [AppEvent.MOVE_NEXT_SINGLE_IMAGE, AppEvent.MOVE_PREV_SINGLE_IMAGE],
  [AppEvent.MOVE_LAST_PAGE, AppEvent.MOVE_FIRST_PAGE],
];

/**
 * 左右操作の反転時に、渡されたイベントが反転したイベントを取得する
 *
 * 反転先のイベントが存在しない場合は、渡されたイベントをそのまま返す
 */
export function getHorizontalSwitchEvent(event: AppEvent): AppEvent {
  const pair = HORIZONTAL_SWITCH_PAIR.find(
    ([left, right]) => left === event || right === event,
  );
  if (pair) {
    return pair[0] === event ? pair[1] : pair[0];
  }
  return event;
}

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region カーソル表示制御
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * マウス移動時にカーソルを再表示するべきかどうかを判定する
 */
export function shouldShowCursorOnMouseMove(isCursorVisible: boolean): boolean {
  return !isCursorVisible;
}

/**
 * 操作イベント実行時にカーソルを非表示にするイベントのリスト
 */
const CURSOR_HIDE_EVENTS: AppEvent[] = [
  AppEvent.MOVE_NEXT_PAGE,
  AppEvent.MOVE_PREV_PAGE,
  AppEvent.MOVE_NEXT_SINGLE_IMAGE,
  AppEvent.MOVE_PREV_SINGLE_IMAGE,
  AppEvent.MOVE_FIRST_PAGE,
  AppEvent.MOVE_LAST_PAGE,
  AppEvent.SWITCH_NEXT_SOURCE,
  AppEvent.SWITCH_PREV_SOURCE,
  AppEvent.SWITCH_RANDOM_SOURCE,
];

/**
 * 操作イベント実行時にカーソルを非表示にするべきかどうかを判定する
 */
export function shouldHideCursorOnAppEvent(event: AppEvent): boolean {
  return CURSOR_HIDE_EVENTS.includes(event);
}
