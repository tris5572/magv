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
  console.log(convertFileSrc(props.path ?? ""));
  return (
    <div className="h-dvh bg-stone-900 flex justify-center items-center">
      {props.path ? (
        <img className="max-h-dvh" src={convertFileSrc(props.path)} />
      ) : (
        <div className="text-stone-200">
          画像またはフォルダをドロップしてください
        </div>
      )}
    </div>
  );
}
