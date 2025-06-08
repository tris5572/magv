import { convertFileSrc } from "@tauri-apps/api/core";
import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";
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
  const magnifierHeight = 600;
  const magnifierWidth = 600;
  const zoomLevel = 8;

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

  /** img 要素の src に指定する文字列。ソース source の種類に応じて切替える */
  const src = useMemo(() => {
    if (!source) {
      return undefined;
    } else if (source instanceof Blob) {
      return URL.createObjectURL(source); // Blob は URL を生成
    } else if (source.startsWith("data:")) {
      return source; // Base64 はそのまま
    } else {
      return convertFileSrc(source); // ローカルのパスは 表示用のパスに変換
    }
  }, [source]);

  if (!source) {
    return null;
  }

  // 表示の大きさ(幅)と位置(寄せる方向)を props に応じて調整
  let containerWidth = undefined;
  let containerJustifyContent = "center";
  if (isHalf) {
    containerWidth = "50%";
    if (justify === "left") {
      containerJustifyContent = "start";
    } else if (justify === "right") {
      containerJustifyContent = "end";
    }
  }

  return (
    <div
      style={{ ...CONTAINER_STYLE, width: containerWidth, justifyContent: containerJustifyContent }}
    >
      <img
        style={IMAGE_STYLE}
        src={src}
        onMouseEnter={(e) => mouseEnter(e)}
        onMouseLeave={(e) => mouseLeave(e)}
        onMouseMove={(e) => mouseMove(e)}
        onDragStart={(e) => e.preventDefault()}
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

/** 1枚の画像 img のスタイル */
const IMAGE_STYLE: React.CSSProperties = {
  height: "100%",
  maxWidth: "100%",
  objectFit: "contain",
  cursor: "default",
};

/** 表示画像のコンテナーのスタイル */
const CONTAINER_STYLE: React.CSSProperties = {
  height: "100%",
  // width は props により可変
  position: "relative",
  display: "flex",
  alignItems: "center",
  // justifyContent は props により可変
  userSelect: "none",
  "-webkit-user-select": "none",
};
