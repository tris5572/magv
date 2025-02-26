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
      <div className="h-dvh bg-stone900 flex items-center justify-center">
        <div className="text-stone-200">
          画像ファイルまたはフォルダをドロップしてください
        </div>
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
    <div className="h-dvh bg-stone900 flex items-center justify-center">
      {<img className="h-dvh object-contain" src={src} />}
    </div>
  );
}
