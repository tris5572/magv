import { createStore } from "jotai";
import { AppEvent } from "../types/event";
import { attachAppMenu } from "./appMenu";

const state = await vi.hoisted(async () => {
  const { atom } = await import("jotai");
  const handleEvent = vi.fn();
  const openFile = vi.fn();
  return {
    next: atom(false),
    prev: atom(false),
    open: atom(false),
    mode: atom<"single" | "double">("double"),
    recent: atom<string[]>([]),
    cursor: atom(true),
    event: atom(null, (_get, _set, event: AppEvent) => handleEvent(event)),
    openFileAtom: atom(null, (_get, _set, path: string) => openFile(path)),
    handleEvent,
    openFile,
  };
});

vi.mock("../atoms/app", () => ({
  canMoveNextAtom: state.next,
  canMovePrevAtom: state.prev,
  isOpenPageAtom: state.open,
  singleOrDoubleAtom: state.mode,
}));
vi.mock("../atoms/event", () => ({ handleEventAtom: state.event }));
vi.mock("../atoms/source", () => ({
  recentSourcePathListAtom: state.recent,
  openFileAtom: state.openFileAtom,
}));

const native = vi.hoisted(() => {
  type Options = {
    text?: string;
    enabled?: boolean;
    checked?: boolean;
    items?: Item[];
    action?: () => void;
  };
  class Item {
    children: Item[];
    enabled: boolean;
    checked: boolean;
    constructor(
      readonly kind: string,
      readonly options: Options,
    ) {
      this.children = [...(options.items ?? [])];
      this.enabled = options.enabled ?? true;
      this.checked = options.checked ?? false;
    }
    close = vi.fn(async () => {});
    setAsAppMenu = vi.fn(async () => null);
    setEnabled = vi.fn(async (value: boolean) => {
      this.enabled = value;
    });
    setChecked = vi.fn(async (value: boolean) => {
      this.checked = value;
    });
    append = vi.fn(async (item: Item) => {
      this.children.push(item);
    });
    remove = vi.fn(async (item: Item) => {
      this.children = this.children.filter((child) => child !== item);
    });
  }
  const items: Item[] = [];
  const make = (kind: string, options: Options = {}) => {
    const item = new Item(kind, options);
    items.push(item);
    return item;
  };
  const menu = vi.fn(async (options: Options) => make("Menu", options));
  return { items, make, menu };
});

vi.mock("@tauri-apps/api/menu", () => ({
  Menu: { new: native.menu },
  MenuItem: { new: async (options: object) => native.make("MenuItem", options) },
  CheckMenuItem: { new: async (options: object) => native.make("Check", options) },
  Submenu: { new: async (options: object) => native.make("Submenu", options) },
  PredefinedMenuItem: { new: async (options: object) => native.make("Predefined", options) },
}));

function find(text: string) {
  const item = native.items.find((item) => item.options.text === text);
  if (!item) throw new Error(`メニュー項目が存在しない: ${text}`);
  return item;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

let detach: (() => void) | undefined;
let releasePending: (() => void) | undefined;

beforeEach(() => {
  native.items.length = 0;
  vi.clearAllMocks();
});

afterEach(async () => {
  releasePending?.();
  releasePending = undefined;
  detach?.();
  detach = undefined;
  await vi.waitFor(() => {
    for (const item of native.items) expect(item.close).toHaveBeenCalledTimes(1);
  });
  vi.restoreAllMocks();
});

async function mount(store = createStore()) {
  detach = attachAppMenu(store);
  await vi.waitFor(() => {
    expect(native.items.find((item) => item.kind === "Menu")?.setAsAppMenu).toHaveBeenCalledTimes(
      1,
    );
  });
  return store;
}

test("前後移動の可否だけを更新し、メニュー全体を再生成しない", async () => {
  const store = await mount();
  const count = native.items.length;
  const menu = native.items.find((item) => item.kind === "Menu")!;
  store.set(state.next, true);
  store.set(state.prev, true);
  store.set(state.open, true);
  await vi.waitFor(() => expect(find("見開き表示").enabled).toBe(true));
  for (const text of [
    "次のページ",
    "1枚次へ",
    "最後のページ",
    "前のページ",
    "1枚前へ",
    "最初のページ",
  ]) {
    expect(find(text).enabled).toBe(true);
    expect(find(text).setEnabled).toHaveBeenCalledTimes(1);
  }
  store.set(state.next, false);
  store.set(state.cursor, false);
  await vi.waitFor(() => expect(find("最後のページ").enabled).toBe(false));
  expect(find("前のページ").setEnabled).toHaveBeenCalledTimes(1);
  expect(find("単体表示").setChecked).not.toHaveBeenCalled();
  expect(native.items).toHaveLength(count);
  expect(menu.setAsAppMenu).toHaveBeenCalledTimes(1);
  find("前のページ").options.action?.();
  expect(state.handleEvent).toHaveBeenCalledWith(AppEvent.MOVE_PREV_PAGE);
});

test("生成中に変わった状態を、登録前に反映する", async () => {
  const gate = deferred();
  releasePending = gate.resolve;
  native.menu.mockImplementationOnce(async (options) => {
    const item = native.make("Menu", options);
    await gate.promise;
    return item;
  });
  const store = createStore();
  detach = attachAppMenu(store);
  await vi.waitFor(() => expect(native.menu).toHaveBeenCalledTimes(1));
  const menu = native.items.find((item) => item.kind === "Menu")!;
  expect(menu.setAsAppMenu).not.toHaveBeenCalled();
  store.set(state.next, true);
  store.set(state.open, true);
  store.set(state.mode, "single");
  gate.resolve();
  await vi.waitFor(() => expect(menu.setAsAppMenu).toHaveBeenCalledTimes(1));
  expect(find("次のページ").enabled).toBe(true);
  expect(find("単体表示").enabled).toBe(true);
  expect(find("単体表示").checked).toBe(true);
  expect(find("見開き表示").checked).toBe(false);
});

test("表示モードを同期し、選択中の項目を再選択してもチェックを維持する", async () => {
  const store = await mount();
  store.set(state.mode, "single");
  await vi.waitFor(() => expect(find("単体表示").checked).toBe(true));
  expect(find("見開き表示").checked).toBe(false);
  const single = find("単体表示");
  const calls = single.setChecked.mock.calls.length;
  // OS が選択中のチェック項目を自動的にオフにする状況を再現する。
  single.checked = false;
  single.options.action?.();
  await vi.waitFor(() => expect(single.setChecked).toHaveBeenCalledTimes(calls + 1));
  expect(single.checked).toBe(true);
  expect(state.handleEvent).toHaveBeenCalledWith(AppEvent.UPDATE_PAGE);
  expect(native.menu).toHaveBeenCalledTimes(1);
});

test("最近使った項目だけを差し替え、古い項目を解放する", async () => {
  const store = await mount();
  const recent = find("最近使った項目を開く");
  const empty = find("項目なし");
  store.set(state.recent, ["/books/a.zip", "/books/b.zip"]);
  await vi.waitFor(() =>
    expect(recent.children.map((item) => item.options.text)).toEqual([
      "/books/a.zip",
      "/books/b.zip",
    ]),
  );
  expect(empty.close).toHaveBeenCalledTimes(1);
  find("/books/b.zip").options.action?.();
  expect(state.openFile).toHaveBeenCalledWith("/books/b.zip");
  store.set(state.recent, []);
  await vi.waitFor(() =>
    expect(recent.children.map((item) => item.options.text)).toEqual(["項目なし"]),
  );
  expect(find("/books/a.zip").close).toHaveBeenCalledTimes(1);
  expect(find("/books/b.zip").close).toHaveBeenCalledTimes(1);
  expect(native.menu).toHaveBeenCalledTimes(1);
});

test("更新処理が遅延しても、最後の移動可否が反映される", async () => {
  const store = await mount();
  const next = find("次のページ");
  const gate = deferred();
  releasePending = gate.resolve;
  next.setEnabled.mockImplementationOnce(async (value) => {
    await gate.promise;
    next.enabled = value;
  });
  store.set(state.next, true);
  await vi.waitFor(() => expect(next.setEnabled).toHaveBeenCalledTimes(1));
  store.set(state.next, false);
  gate.resolve();
  await vi.waitFor(() => expect(next.setEnabled).toHaveBeenLastCalledWith(false));
  expect(next.enabled).toBe(false);
  expect(find("最後のページ").enabled).toBe(false);
  expect(native.menu).toHaveBeenCalledTimes(1);
});

test("StrictMode の即時再マウントでは登録を一度だけ行う", async () => {
  const store = createStore();
  attachAppMenu(store)();
  await mount(store);
  expect(native.menu).toHaveBeenCalledTimes(1);
});

test("初期化中のアンマウント後は登録せず、次のマウントより先に解放する", async () => {
  const gate = deferred();
  releasePending = gate.resolve;
  native.menu.mockImplementationOnce(async (options) => {
    const item = native.make("Menu", options);
    await gate.promise;
    return item;
  });
  const store = createStore();
  const stop = attachAppMenu(store);
  await vi.waitFor(() => expect(native.menu).toHaveBeenCalledTimes(1));
  const oldItems = [...native.items];
  stop();
  detach = attachAppMenu(store);
  gate.resolve();
  await vi.waitFor(() => expect(native.menu).toHaveBeenCalledTimes(2));
  const oldMenu = oldItems.find((item) => item.kind === "Menu")!;
  expect(oldMenu.setAsAppMenu).not.toHaveBeenCalled();
  for (const item of oldItems) expect(item.close).toHaveBeenCalledTimes(1);
  const newMenu = native.items.filter((item) => item.kind === "Menu")[1];
  await vi.waitFor(() => expect(newMenu.setAsAppMenu).toHaveBeenCalledTimes(1));
});

test("初期化に失敗しても生成済みリソースを解放し、再マウントできる", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  native.menu.mockRejectedValueOnce(new Error("生成失敗"));
  detach = attachAppMenu(createStore());
  await vi.waitFor(() =>
    expect(error).toHaveBeenCalledWith("メニューの初期化に失敗", expect.any(Error)),
  );
  for (const item of native.items) expect(item.close).toHaveBeenCalledTimes(1);
  detach();
  await mount();
  expect(native.menu).toHaveBeenCalledTimes(2);
});
