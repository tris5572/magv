import { lstat, readDir, stat } from "@tauri-apps/plugin-fs";

/**
 * 渡されたパスのファイル種別を判別する
 *
 * 不明なときは `undefined`
 */
export async function getPathKind(
  path: string
): Promise<"image" | "zip" | "directory" | undefined> {
  if (path.toLowerCase().endsWith(".zip")) {
    return "zip";
  }

  if (/\.(jpe?g|png|gif|bmp|webp)$/i.test(path)) {
    return "image";
  }

  // ディレクトリの判定は、`/` で終わるとき(あまりないはず)と、実際にディレクトリの場合がある
  if (path.endsWith("/")) {
    return "directory";
  }
  const stat = await lstat(path);
  if (stat.isDirectory) {
    return "directory";
  }

  return undefined;
}

/**
 * パスから拡張子を取り除いたファイル名を返す
 */
export function getFileNameRemovedExtension(path: string): string {
  const name = path.split("/").pop(); // TODO: どの文字で区切るかを環境に基づいて判定する

  // ディレクトリのときなどは空文字列を返す
  if (!name) {
    return "";
  }

  const buf = name.split(".");

  // ファイル名がないとき(空文字列のとき)はそのまま返す
  if (buf.length === 0) {
    return name;
  }

  const ext = buf[buf.length - 1];

  // 拡張子部分が長い場合はそのまま返す（ピリオドが拡張子の区切りを表すものではないと判断）
  if (5 <= ext.length) {
    return name;
  }

  // 拡張子部分を除いて返す
  return name.split(".").slice(0, -1).join(".");
}

/**
 * 指定された path を元に、kind の種類のファイルのリストを返す
 *
 * path がファイルの場合は、そのディレクトリ内のリストを返す
 *
 * 再帰的な読み込みは行わない
 */
export async function getFileList(path: string, kind: "zip" | "image"): Promise<string[]> {
  const dir = await dirFromPath(path);

  // zip ファイルのみを抽出する
  const sourceList = await readDir(dir);
  const array = [];
  for (const source of sourceList) {
    // ファイルではないときと、ピリオドから始まる特殊ファイル(.DS_Store 等)のときはスキップする
    if (!source.isFile || source.name.startsWith(".")) {
      continue;
    }
    const name = source.name;
    const target = dir + "/" + name; //ここで @tauri-apps/api/path の join(dir, name) を使うととても遅い
    const k = await getPathKind(target);

    if (k === kind) {
      array.push(target);
    }
  }

  // ロケールを考慮してソートし、Finder のファイル名の並び順と同じにする
  array.sort((a, b) => a.localeCompare(b, [], { numeric: true }));

  return array;
}

/**
 * パスが存在するディレクトリを返す
 */
export async function dirFromPath(path: string): Promise<string> {
  const st = await stat(path);

  if (st.isDirectory) {
    return path;
  }

  return path.split("/").slice(0, -1).join("/");
}
