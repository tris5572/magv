import { convertFileSrc } from "@tauri-apps/api/core";

type Props = {
  /**
   * 画像のソース
   *
   * - ローカルのパス (string)
   * - 画像を Base64 エンコードしたもの (string)
   * - 画像の Blob
   */
  source?: string | Blob;
};

/**
 * 1枚の画像を表示するコンポーネント
 *
 * 画像のローカルなパスを渡すことで表示する
 */
export function SingleImageView({ source }: Props) {
  if (!source) {
    return (
      <div className="h-full bg-stone900 flex items-center justify-center select-none text-stone-200">
        画像ファイルまたはフォルダをドロップしてください
      </div>
    );
  }

  const src =
    source instanceof Blob
      ? URL.createObjectURL(source) // Blob は URL を生成
      : source.startsWith("data:")
      ? source // Base64 はそのまま
      : convertFileSrc(source); // ローカルのパスは、表示用のパスに変換

  return (
    <div className="h-full bg-stone900 flex items-center justify-center select-none">
      {<img className="h-full object-contain" src={src} />}
    </div>
  );
}
