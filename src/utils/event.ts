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
  const pair = HORIZONTAL_SWITCH_PAIR.find(([left, right]) => left === event || right === event);
  if (pair) {
    return pair[0] === event ? pair[1] : pair[0];
  }
  return event;
}
