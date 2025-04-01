import { AppEvent } from "../types/event";
import { getHorizontalSwitchEvent } from "./event";

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
