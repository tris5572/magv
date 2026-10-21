import type { Resource } from "@tauri-apps/api/core";
import { CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import type { createStore } from "jotai";
import { canMoveNextAtom, canMovePrevAtom, isOpenPageAtom, singleOrDoubleAtom } from "../atoms/app";
import { handleEventAtom } from "../atoms/event";
import { openFileAtom, recentSourcePathListAtom } from "../atoms/source";
import { AppEvent } from "../types/event";

type Store = ReturnType<typeof createStore>;
type OwnResource = <T extends Resource>(resource: Promise<T>) => Promise<T>;

// StrictMode や再マウント時も、古い初期化・解放が終わってから次を開始する。
let lifecycle = Promise.resolve();

/** アプリメニューを登録し、必要な atom の変更だけをネイティブ項目へ反映する。 */
export function attachAppMenu(store: Store) {
  let disposed = false;
  let appMenu: Awaited<ReturnType<typeof createAppMenu>> | undefined;
  const resources = new Set<Resource>();
  const own: OwnResource = async (promise) => {
    const resource = await promise;
    resources.add(resource);
    return resource;
  };
  const release = async (resource: Resource) => {
    await resource.close();
    resources.delete(resource);
  };
  const closeResources = async () => {
    const results = await Promise.allSettled([...resources].reverse().map(release));
    for (const result of results) {
      if (result.status === "rejected") console.error("メニューの解放に失敗", result.reason);
    }
  };

  let updates = Promise.resolve();
  const requestUpdate = () => {
    updates = updates
      .then(async () => {
        if (!disposed) await appMenu?.update();
      })
      .catch((error: unknown) => console.error("メニューの更新に失敗", error));
  };
  const unsubscribe = [
    canMoveNextAtom,
    canMovePrevAtom,
    isOpenPageAtom,
    singleOrDoubleAtom,
    recentSourcePathListAtom,
  ].map((target) => store.sub(target, requestUpdate));

  lifecycle = lifecycle
    .then(async () => {
      if (disposed) return;
      appMenu = await createAppMenu(store, own, release, requestUpdate);
      if (disposed) return;
      // 生成中に変わった状態も、登録前に反映する。
      await appMenu.update();
      if (disposed) return;
      const previous = await appMenu.menu.setAsAppMenu();
      await previous?.close();
    })
    .catch(async (error: unknown) => {
      disposed = true;
      unsubscribe.forEach((stop) => stop());
      await closeResources();
      console.error("メニューの初期化に失敗", error);
    });
  updates = lifecycle;

  return () => {
    disposed = true;
    unsubscribe.forEach((stop) => stop());
    lifecycle = lifecycle.then(async () => {
      await updates;
      await closeResources();
    });
  };
}

async function createAppMenu(
  store: Store,
  own: OwnResource,
  release: (resource: Resource) => Promise<void>,
  requestUpdate: () => void,
) {
  let canMoveNext = store.get(canMoveNextAtom);
  let canMovePrev = store.get(canMovePrevAtom);
  let isOpenPage = store.get(isOpenPageAtom);
  let singleOrDouble = store.get(singleOrDoubleAtom);
  let checkRevision = 0;
  let appliedCheckRevision = 0;
  let recentPaths: string[] | undefined;
  let recentItems: MenuItem[] = [];

  function selectMode(mode: "single" | "double") {
    store.set(singleOrDoubleAtom, mode);
    store.set(handleEventAtom, AppEvent.UPDATE_PAGE);
    // ネイティブ側の自動トグルを補正する。同じ項目の再選択でも同期が必要。
    checkRevision++;
    requestUpdate();
  }

  const separator = await own(
    PredefinedMenuItem.new({
      text: "-",
      item: "Separator",
    }),
  );

  // macOS では最初の1つがアプリ名のメニューになる
  const app = await own(
    Submenu.new({
      text: "magv",
      items: [
        await own(
          MenuItem.new({
            text: "magv について",
            action: () => {},
            enabled: false,
          }),
        ),
        separator,
        await own(
          MenuItem.new({
            text: "設定",
            action: () => {},
            enabled: false,
          }),
        ),
        separator,
        await own(
          PredefinedMenuItem.new({
            text: "magv を非表示",
            item: "Hide",
          }),
        ),
        await own(
          PredefinedMenuItem.new({
            text: "ほかを非表示",
            item: "HideOthers",
          }),
        ),
        await own(
          PredefinedMenuItem.new({
            text: "すべてを表示",
            item: "ShowAll",
          }),
        ),
        separator,
        await own(
          PredefinedMenuItem.new({
            text: "magv を終了",
            item: "Quit",
          }),
        ),
      ],
    }),
  );

  const recent = await own(Submenu.new({ text: "最近使った項目を開く" }));
  const file = await own(
    Submenu.new({
      text: "ファイル",
      items: [
        await own(
          MenuItem.new({
            text: "ファイルを開く",
            accelerator: "Command+o",
            action: () => {},
            enabled: false,
          }),
        ),
        recent,
        separator,
        await own(
          MenuItem.new({
            text: "ウィンドウを閉じる",
            accelerator: "Command+W",
            action: () => {},
          }),
        ),
      ],
    }),
  );

  const edit = await own(
    Submenu.new({
      text: "編集",
      items: [
        await own(
          PredefinedMenuItem.new({
            text: "元に戻す",
            item: "Undo",
          }),
        ),
        await own(
          PredefinedMenuItem.new({
            text: "やり直し",
            item: "Redo",
          }),
        ),
        separator,
        await own(
          PredefinedMenuItem.new({
            text: "切り取り",
            item: "Cut",
          }),
        ),
        await own(
          PredefinedMenuItem.new({
            text: "コピー",
            item: "Copy",
          }),
        ),
        await own(
          PredefinedMenuItem.new({
            text: "貼り付け",
            item: "Paste",
          }),
        ),
        await own(
          PredefinedMenuItem.new({
            text: "すべて選択",
            item: "SelectAll",
          }),
        ),
      ],
    }),
  );

  const single = await own(
    CheckMenuItem.new({
      text: "単体表示",
      checked: singleOrDouble === "single",
      enabled: isOpenPage,
      action: () => selectMode("single"),
    }),
  );
  const double = await own(
    CheckMenuItem.new({
      text: "見開き表示",
      checked: singleOrDouble === "double",
      enabled: isOpenPage,
      action: () => selectMode("double"),
    }),
  );
  const view = await own(Submenu.new({ text: "表示", items: [single, double] }));

  const nextItems: MenuItem[] = [];
  const prevItems: MenuItem[] = [];
  const moveItem = async (text: string, event: AppEvent, next: boolean) => {
    const item = await own(
      MenuItem.new({
        text,
        action: () => store.set(handleEventAtom, event),
        enabled: next ? canMoveNext : canMovePrev,
      }),
    );
    (next ? nextItems : prevItems).push(item);
    return item;
  };
  const move = await own(
    Submenu.new({
      text: "移動",
      items: [
        await moveItem("次のページ", AppEvent.MOVE_NEXT_PAGE, true),
        await moveItem("前のページ", AppEvent.MOVE_PREV_PAGE, false),
        separator,
        await moveItem("1枚次へ", AppEvent.MOVE_NEXT_SINGLE_IMAGE, true),
        await moveItem("1枚前へ", AppEvent.MOVE_PREV_SINGLE_IMAGE, false),
        separator,
        await moveItem("最後のページ", AppEvent.MOVE_LAST_PAGE, true),
        await moveItem("最初のページ", AppEvent.MOVE_FIRST_PAGE, false),
      ],
    }),
  );

  const window = await own(
    Submenu.new({
      text: "ウィンドウ",
      items: [
        await own(
          PredefinedMenuItem.new({
            text: "フルスクリーン",
            item: "Fullscreen",
          }),
        ),
        separator,
        await own(
          PredefinedMenuItem.new({
            text: "拡大/縮小",
            item: "Maximize",
          }),
        ),
        await own(
          PredefinedMenuItem.new({
            text: "最小化",
            item: "Minimize",
          }),
        ),
      ],
    }),
  );

  const menu = await own(
    Menu.new({
      items: [app, file, edit, view, move, window],
    }),
  );

  return {
    menu,
    async update() {
      const next = store.get(canMoveNextAtom);
      if (canMoveNext !== next) {
        for (const item of nextItems) await item.setEnabled(next);
        canMoveNext = next;
      }
      const prev = store.get(canMovePrevAtom);
      if (canMovePrev !== prev) {
        for (const item of prevItems) await item.setEnabled(prev);
        canMovePrev = prev;
      }
      const open = store.get(isOpenPageAtom);
      if (isOpenPage !== open) {
        await single.setEnabled(open);
        await double.setEnabled(open);
        isOpenPage = open;
      }
      const mode = store.get(singleOrDoubleAtom);
      const revision = checkRevision;
      if (singleOrDouble !== mode || appliedCheckRevision !== revision) {
        await single.setChecked(mode === "single");
        await double.setChecked(mode === "double");
        singleOrDouble = mode;
        appliedCheckRevision = revision;
      }
      const paths = store.get(recentSourcePathListAtom);
      if (recentPaths !== paths) {
        const items: MenuItem[] = [];
        if (paths.length === 0) {
          items.push(await own(MenuItem.new({ text: "項目なし", enabled: false })));
        } else {
          for (const path of paths) {
            items.push(
              await own(
                MenuItem.new({
                  text: path,
                  action: () => {
                    void store.set(openFileAtom, path);
                  },
                }),
              ),
            );
          }
        }
        while (recentItems.length > 0) {
          const item = recentItems[0];
          await recent.remove(item);
          recentItems.shift();
          await release(item);
        }
        for (const item of items) {
          await recent.append(item);
          recentItems.push(item);
        }
        recentPaths = paths;
      }
    },
  };
}
