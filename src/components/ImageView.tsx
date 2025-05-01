import { CSSProperties } from "react";
import { useAtomValue } from "jotai";
import { pageDirectionAtom, viewingImageAtom } from "../atoms/app";
import { SingleImageView } from "./SingleImageView";

/**
 * 画像を表示するコンポーネント
 */
export function ImageView() {
  const openImagePath = useAtomValue(viewingImageAtom);
  const pageDirection = useAtomValue(pageDirectionAtom);

  // 見開き表示
  if (openImagePath?.type === "double") {
    return (
      <div style={getDoubleStyle(pageDirection)}>
        <SingleImageView source={openImagePath?.source1} isHalf justify="left" />
        <SingleImageView source={openImagePath?.source2} isHalf justify="right" />
      </div>
    );
  }
  // 画像なし
  if (!openImagePath?.source) {
    return <EmptyMessage />;
  }
  // 単体表示
  return (
    <div style={SINGLE_STYLE}>
      <SingleImageView source={openImagePath?.source} />
    </div>
  );
}

/** 画像単体表示時のスタイル */
const SINGLE_STYLE: CSSProperties = {
  height: "calc(100dvh - 32px)",
  overflow: "hidden",
};

/**
 * 見開き表示時のスタイルを返す
 * @param pageDirection ページの開き方向
 */
function getDoubleStyle(pageDirection: "right" | "left"): CSSProperties {
  return {
    height: "calc(100dvh - 32px)",
    display: "flex",
    flexDirection: pageDirection === "left" ? "row-reverse" : "row",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  };
}

/** 空のメッセージのスタイル */
const PLACEHOLDER_STYLE: CSSProperties = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  userSelect: "none",
  "-webkit-user-select": "none",
  background: "var(--black-color)",
  color: "color-mix(in srgb, var(--white-color) 50%, transparent)",
  fontSize: "1.6rem",
};

/**
 * 画像を表示していない空のときにメッセージを表示するコンポーネント
 */
function EmptyMessage() {
  return (
    <div style={PLACEHOLDER_STYLE}>
      ファイルをドロップしてください
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
