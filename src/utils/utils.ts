import { convertFileSrc } from "@tauri-apps/api/core";
import { WindowConfig } from "../types/config";
import { appConfigDir, join } from "@tauri-apps/api/path";
import { exists, mkdir, open, readTextFile } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
/**
 * 画像のサイズを取得する
 *
 * 指定可能な画像ソースは以下のもの
 *
 * - ローカルのパス (string)
 * - 画像の Base64 エンコード (string)
 * - 画像の Blob
 */
export function getImageSize(
  source: string | Blob
): Promise<{ width: number; height: number } | undefined> {
  // 何もしない Promise を返す
  if (!source) {
    return new Promise((resolve) => {
      resolve(undefined);
    });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (error) => {
      reject(error);
    };
    const src =
      source instanceof Blob
        ? URL.createObjectURL(source) // Blob は URL を生成
        : source.startsWith("data:")
        ? source // Base64 はそのまま
        : convertFileSrc(source); // ローカルのパスは、表示用のパスに変換
    img.src = src;
  });
}

/**
 * 画像の向きを取得する
 *
 * - 縦向きの場合は "portrait"
 * - 横向きの場合は "landscape"
 * - 画像のサイズが取得できなかった場合は `undefined`
 */
export async function getImageOrientation(source: string | Blob) {
  const size = await getImageSize(source);
  if (!size) {
    return undefined;
  }

  return size.width < size.height ? "portrait" : "landscape";
}

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region 設定ファイル
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/**
 * 設定ファイルを指定された名前で保存する
 */
export async function storeConfigFile(config: WindowConfig, name: string) {
  const json = JSON.stringify(config);
  const dir = await appConfigDir(); // macOS では /Users/{username}/Library/Application Support/{identifier}
  const path = await join(dir, name);

  // 保存先のディレクトリが存在しないときは作成する
  if (!(await exists(dir))) {
    await mkdir(dir);
  }

  // ファイルを書き込む
  const file = await open(path, { create: true, write: true, truncate: true });
  await file.write(new TextEncoder().encode(json));
  await file.close();
}

/**
 * 指定されたファイル名の設定ファイルを読み込む
 *
 * 設定が存在しない等で読み込めなかった場合は undefined を返す
 */
export async function readConfigFile(name: string): Promise<WindowConfig | undefined> {
  const dir = await appConfigDir(); // macOS では /Users/{username}/Library/Application Support/{identifier}
  const path = await join(dir, name);

  // 設定ファイルが見つからないときは何もしない
  if (!(await exists(path))) {
    return undefined;
  }

  // ファイルを読み込む
  const text = await readTextFile(path);
  const json = JSON.parse(text) as WindowConfig;
  return json;
}

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
// #region その他
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

export function searchAtBrowser(keyword: string) {
  if (keyword) {
    // const url = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
    const url = `https://duckduckgo.com/?t=h_&q=${encodeURIComponent(keyword)}`;
    openUrl(url);
  }
}
