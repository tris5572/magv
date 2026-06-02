import { AppEvent } from "../types/event";
import {
  getHorizontalSwitchEvent,
  shouldHideCursorOnAppEvent,
  shouldShowCursorOnMouseMove,
} from "./event";

describe("左右操作反転 getHorizontalSwitchEvent", () => {
  test("次ページへの移動が、前ページへの移動に変わること", () => {
    const event = getHorizontalSwitchEvent(AppEvent.MOVE_NEXT_PAGE);
    expect(event).toBe(AppEvent.MOVE_PREV_PAGE);
  });

  test("前ページへの移動が、次ページへの移動に変わること", () => {
    const event = getHorizontalSwitchEvent(AppEvent.MOVE_PREV_PAGE);
    expect(event).toBe(AppEvent.MOVE_NEXT_PAGE);
  });

  test("最初のページへの移動が、最後のページへの移動に変わること", () => {
    const event = getHorizontalSwitchEvent(AppEvent.MOVE_FIRST_PAGE);
    expect(event).toBe(AppEvent.MOVE_LAST_PAGE);
  });

  test("最後のページへの移動が、最初のページへの移動に変わること", () => {
    const event = getHorizontalSwitchEvent(AppEvent.MOVE_LAST_PAGE);
    expect(event).toBe(AppEvent.MOVE_FIRST_PAGE);
  });

  test("反転先がないファイル名検索が、そのまま返されること", () => {
    const event = getHorizontalSwitchEvent(AppEvent.SEARCH_FILE_NAME);
    expect(event).toBe(AppEvent.SEARCH_FILE_NAME);
  });
});

describe("カーソル表示制御", () => {
  test("カーソル非表示中はマウス移動で再表示判定が true になること", () => {
    expect(shouldShowCursorOnMouseMove(false)).toBe(true);
  });

  test("カーソル表示中はマウス移動で再表示判定が false になること", () => {
    expect(shouldShowCursorOnMouseMove(true)).toBe(false);
  });

  test("ページ移動イベントでは非表示判定が true になること", () => {
    expect(shouldHideCursorOnAppEvent(AppEvent.MOVE_NEXT_PAGE)).toBe(true);
    expect(shouldHideCursorOnAppEvent(AppEvent.MOVE_PREV_PAGE)).toBe(true);
    expect(shouldHideCursorOnAppEvent(AppEvent.MOVE_FIRST_PAGE)).toBe(true);
    expect(shouldHideCursorOnAppEvent(AppEvent.MOVE_LAST_PAGE)).toBe(true);
  });

  test("ファイル切替イベントでは非表示判定が true になること", () => {
    expect(shouldHideCursorOnAppEvent(AppEvent.SWITCH_NEXT_SOURCE)).toBe(true);
    expect(shouldHideCursorOnAppEvent(AppEvent.SWITCH_PREV_SOURCE)).toBe(true);
    expect(shouldHideCursorOnAppEvent(AppEvent.SWITCH_RANDOM_SOURCE)).toBe(
      true,
    );
  });

  test("ページ移動/ファイル切替以外では非表示判定が false になること", () => {
    expect(shouldHideCursorOnAppEvent(AppEvent.SEARCH_FILE_NAME)).toBe(false);
    expect(shouldHideCursorOnAppEvent(AppEvent.UPDATE_PAGE)).toBe(false);
  });
});
