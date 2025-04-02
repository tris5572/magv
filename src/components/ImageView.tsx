import { useAtomValue } from "jotai";
import { pageDirectionAtom, viewingImageAtom } from "../atoms/app";
import { SingleImageView } from "./SingleImageView";

/**
 * 画像を表示するコンポーネント
 */
export function ImageView() {
  const openImagePath = useAtomValue(viewingImageAtom);
  const pageDirection = useAtomValue(pageDirectionAtom);

  const doubleStyle: React.CSSProperties = {
    height: "calc(100dvh - 32px)",
    display: "flex",
    flexDirection: pageDirection === "left" ? "row-reverse" : "row",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  };

  const singleStyle: React.CSSProperties = {
    height: "calc(100dvh - 32px)",
    overflow: "hidden",
  };

  return (
    <>
      {openImagePath && openImagePath?.type === "double" ? (
        <div style={doubleStyle}>
          <SingleImageView source={openImagePath?.source1} isHalf justify="left" />
          <SingleImageView source={openImagePath?.source2} isHalf justify="right" />
        </div>
      ) : (
        <div style={singleStyle}>
          <SingleImageView source={openImagePath?.source} />
        </div>
      )}
    </>
  );
}
