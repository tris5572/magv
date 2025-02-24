import { convertFileSrc } from "@tauri-apps/api/core";

type Props = {
  /**
   * 画像のパス
   */
  path?: string;
};

/**
 * 1枚の画像を表示するコンポーネント
 *
 * 画像のローカルなパスを渡すことで表示する
 */
export function SingleImageView(props: Props) {
  return (
    <div className="h-dvh bg-stone900 flex items-center justify-center">
      {props.path ? (
        <img
          className="h-dvh object-contain"
          src={
            props.path.startsWith("data:")
              ? props.path // base64 の場合はそのまま表示
              : convertFileSrc(props.path)
          }
        />
      ) : (
        <div className="text-stone-200">
          画像ファイルまたはフォルダをドロップしてください
        </div>
      )}
    </div>
  );
}
