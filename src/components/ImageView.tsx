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

  if (openImagePath && openImagePath?.type === "double") {
    return (
      <div style={doubleStyle}>
        <SingleImageView source={openImagePath?.source1} isHalf justify="left" />
        <SingleImageView source={openImagePath?.source2} isHalf justify="right" />
      </div>
    );
  }

  if (!openImagePath?.source) {
    return <EmptyMessage />;
  }

  return (
    <div style={singleStyle}>
      <SingleImageView source={openImagePath?.source} />
    </div>
  );
}

/** 空のメッセージのスタイル */
const PLACEHOLDER_STYLE: React.CSSProperties = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  userSelect: "none",
  "-webkit-user-select": "none",
  background: "var(--black-color)",
  color: "color-mix(in srgb, var(--white-color) 50%, transparent)",
};

/**
 * 画像を表示していない空のときにメッセージを表示するコンポーネント
 */
function EmptyMessage() {
  return (
    <div style={PLACEHOLDER_STYLE}>
      以下のものをドロップしてください
      <br />
      <br />
      画像をまとめた zip ファイル
      <br />
      画像ファイル
      <br />
      画像が入ったフォルダ
    </div>
  );
}
