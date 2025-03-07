import { useAtom } from "jotai";
import { viewingImageAtom } from "../atoms/app";
import { SingleImageView } from "./SingleImageView";

/**
 * 画像を表示するコンポーネント
 */
export function ImageView() {
  const [openImagePath] = useAtom(viewingImageAtom);

  return (
    <>
      {openImagePath && openImagePath?.type === "double" ? (
        <div className="h-[calc(100dvh-32px)] flex flex-row-reverse justify-center items-center">
          <SingleImageView source={openImagePath?.source1} />
          <SingleImageView source={openImagePath?.source2} />
        </div>
      ) : (
        <div className="h-[calc(100dvh-32px)]">
          <SingleImageView source={openImagePath?.source} />
        </div>
      )}
    </>
  );
}
