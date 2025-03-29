import { convertFileSrc } from "@tauri-apps/api/core";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { isMagnifierEnabledAtom } from "../atoms/app";

type Props = {
  /**
   * 画像のソース
   *
   * - ローカルのパス (string)
   * - 画像を Base64 エンコードしたもの (string)
   * - 画像の Blob
   */
  source?: string | Blob;
  /**
   * 画像の表示幅を 50% にするかどうかのフラグ
   *
   * 見開き表示時に渡すことで、左右の画像を同じ幅に設定でき、サイズが不安定になる事象を防げる
   */
  isHalf?: boolean;
  /**
   * 見開きで半分にしたとき、左右どちらに寄せるかの設定
   *
   * 見開き表示時のみ有効
   *
   * 省略すると `center` として中央に寄せる
   */
  justify?: "left" | "center" | "right";
};

const PLACEHOLDER_STYLE = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  userSelect: "none",
  "-webkit-user-select": "none",
  background: "var(--black-color)",
  color: "var(--white-color)",
} as React.CSSProperties; // TODO: satisfies に書き換える。ベンダープレフィックスに対応するため as にしているが、Safari が user-select に対応したら satisfies にする

/**
 * 1枚の画像を表示するコンポーネント
 *
 * 画像のローカルなパスを渡すことで表示する
 */
export function SingleImageView({ source, isHalf, justify }: Props) {
  // TODO: ルーペの表示位置がずれるので対処する。ただ表示位置を CSS に任せているので自前で制御するのは難度が高い

  // ルーペのフラグ類
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [[imgWidth, imgHeight], setSize] = useState([0, 0]);
  const [[x, y], setXY] = useState([0, 0]);
  const isMagnifierEnabled = useAtomValue(isMagnifierEnabledAtom);

  // ルーペの定数
  const magnifierHeight = 300;
  const magnifierWidth = 300;
  const zoomLevel = 4;

  const mouseEnter = (e: React.MouseEvent) => {
    const el = e.currentTarget;
    const { width, height } = el.getBoundingClientRect();
    setSize([width, height]);
    setShowMagnifier(true);
  };

  const mouseLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMagnifier(false);
  };

  const mouseMove = (e: React.MouseEvent) => {
    const el = e.currentTarget;
    const { top, left } = el.getBoundingClientRect();
    const x = e.pageX - left - window.scrollX;
    const y = e.pageY - top - window.scrollY;
    setXY([x, y]);
  };

  if (!source) {
    return <div style={PLACEHOLDER_STYLE}>画像ファイルまたはフォルダをドロップしてください</div>;
  }

  const src =
    source instanceof Blob
      ? URL.createObjectURL(source) // Blob は URL を生成
      : source.startsWith("data:")
      ? source // Base64 はそのまま
      : convertFileSrc(source); // ローカルのパスは、表示用のパスに変換

  /** 表示画像のコンテナーのスタイル */
  const containerStyle: React.CSSProperties = {
    height: "100%",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    width: "50%",
  };
  if (isHalf) {
    if (justify === "left") {
      containerStyle.justifyContent = "start";
    } else if (justify === "right") {
      containerStyle.justifyContent = "end";
    }
  } else {
    containerStyle.width = undefined;
  }

  return (
    <div style={containerStyle}>
      <img
        style={{ height: "100%", objectFit: "contain" }}
        src={src}
        onMouseEnter={(e) => mouseEnter(e)}
        onMouseLeave={(e) => mouseLeave(e)}
        onMouseMove={(e) => mouseMove(e)}
      />
      <div
        style={{
          display: isMagnifierEnabled && showMagnifier ? "" : "none",
          position: "absolute",
          pointerEvents: "none",
          height: `${magnifierHeight}px`,
          width: `${magnifierWidth}px`,
          opacity: "1",
          border: "1px solid lightgrey",
          backgroundColor: "white",
          borderRadius: "5px",
          backgroundImage: `url('${src}')`,
          backgroundRepeat: "no-repeat",
          top: `${y - magnifierHeight / 2}px`,
          left: `${x - magnifierWidth / 2}px`,
          backgroundSize: `${imgWidth * zoomLevel}px ${imgHeight * zoomLevel}px`,
          backgroundPositionX: `${-x * zoomLevel + magnifierWidth / 2}px`,
          backgroundPositionY: `${-y * zoomLevel + magnifierHeight / 2}px`,
        }}
      />
    </div>
  );
}
