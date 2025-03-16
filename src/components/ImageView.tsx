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
        <div className="h-[calc(100dvh-32px)] flex flex-row-reverse justify-center items-center overflow-hidden">
          <SingleImageView
            source={openImagePath?.source1}
            isHalf
            justify="left"
          />
          <SingleImageView
            source={openImagePath?.source2}
            isHalf
            justify="right"
          />
        </div>
      ) : (
        <div className="h-[calc(100dvh-32px)] overflow-hidden">
          <SingleImageView source={openImagePath?.source} />
        </div>
      )}
    </>
  );
}
