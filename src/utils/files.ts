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
