import { lstat } from "@tauri-apps/plugin-fs";

/**
 * 渡されたパスのファイル種別を判別する
 *
 * 不明なときは `undefined`
 */
export async function getPathKind(
  path: string
): Promise<"image" | "zip" | "directory" | undefined> {
  if (/\.(jpe?g|png|gif|bmp|webp)$/i.test(path)) {
    return "image";
  }

  if (path.toLowerCase().endsWith(".zip")) {
    return "zip";
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
