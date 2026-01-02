import { exists, lstat, readDir, stat } from "@tauri-apps/plugin-fs";

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
 *
 * ディレクトリ(末尾が `/`)が渡されたときは空文字列を返す
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
 * 指定されたディレクトリの中で、kind の種類のファイルのリストを返す
 *
 * ファイルが指定された場合は、そのファイルが存在するディレクトリ内のリストを返す
 *
 * 再帰的な読み込みは行わない
 */
export async function getFileList(
  path: string,
  kind: "zip" | "image" | "directory"
): Promise<string[]> {
  const dir = await dirFromPath(path);

  const sourceList = await readDir(dir);
  const array = [];

  for (const source of sourceList) {
    if (kind === "zip" || kind === "image") {
    // ファイルではないときと、ピリオドから始まる特殊ファイル(.DS_Store 等)のときはスキップする
    if (!source.isFile || source.name.startsWith(".")) {
      continue;
      }
    }
    if (kind === "directory") {
      // ディレクトリではないときはスキップする
      if (!source.isDirectory) {
        continue;
      }
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
 *
 * - path がディレクトリのときはそのまま
 * - path がファイルのときは所属するディレクトリ
 */
export async function dirFromPath(path: string): Promise<string> {
  const st = await stat(path);

  if (st.isDirectory) {
    return path;
  }

  return path.split("/").slice(0, -1).join("/");
}

/**
 * ビックリマークを付与したファイル名を生成する
 *
 * 変更後の名前のファイルがすでに存在している場合、存在しなくなるまで末尾に `_` を付与する
 */
export async function createExclamationAddedPath(path: string): Promise<string> {
  const buf = path.split("/"); // TODO: どの文字で区切るかを環境に基づいて判定する
  const name = buf.pop();

  if (!name) {
    throw new Error("不正なパス");
  }

  let newName = "!" + name;
  let newPath = [...buf, newName].join("/");

  // 変更後のファイル名がすでに存在している場合、ファイル名と拡張子に分割し、ファイル名の末尾に `_` を付与してから結合して戻す
  while (await exists(newPath)) {
    const [n, e] = newName.split(".");
    newName = `${n}_.${e}`;
    newPath = [...buf, newName].join("/");
  }

  return newPath;
}

/**
 * パス `path` のファイルを `name` へリネームしたパスを返す
 *
 * `name` は拡張子を除いた部分を指定する（元の拡張子をこの処理の中で付与するため）
 *
 * 変更後のファイル名がすでに存在している場合、存在しなくなるまで末尾に `_` を付与してからリネームする
 */
export async function createRenamedPathToExcludeExtensionName(
  path: string,
  name: string
): Promise<string> {
  const buf = path.split("/"); // TODO: どの文字で区切るかを環境に基づいて判定する
  const beforeName = buf.pop() ?? ""; // 元のファイル名を取り除きつつ、取得
  const ext = beforeName.split(".").pop(); // 拡張子を取得

  let newBody = name; // 新しいファイル名の拡張子を除いた部分
  let newName = ext ? `${name}.${ext}` : name; // 新しいファイル名の拡張子を含んだ部分
  let newPath = [...buf, newName].join("/");

  if (beforeName === newName) {
    return path;
  }

  // 変更後のファイル名がすでに存在している場合、ファイル名と拡張子に分割し、ファイル名の末尾に `_` を付与してから結合して戻す
  while (await exists(newPath)) {
    newBody = `${newBody}_`;
    newName = ext ? `${newBody}.${ext}` : `${newBody}`; // 元のパスの拡張子の有無で生成するファイル名を切り替える
    newPath = [...buf, newName].join("/");
  }

  return newPath;
}
