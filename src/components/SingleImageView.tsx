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
  // ルーペのフラグ類
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [[imgWidth, imgHeight], setSize] = useState([0, 0]);
  const [[imageX, imageY], setImageXY] = useState([0, 0]);
  const [[lensX, lensY], setLensXY] = useState([0, 0]);
  const isMagnifierEnabled = useAtomValue(isMagnifierEnabledAtom);

  // ルーペの定数
  const magnifierHeight = 600;
  const magnifierWidth = 600;
  const zoomLevel = 8;

  const mouseEnter = (e: React.MouseEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const { width, height } = el.getBoundingClientRect();
    const [displayedWidth, displayedHeight] = getContainedImageSize(
      width,
      height,
      el.naturalWidth,
      el.naturalHeight,
    );
    setSize([displayedWidth, displayedHeight]);
    setShowMagnifier(true);
  };

  const mouseLeave = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    setShowMagnifier(false);
  };

  const mouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const imgRect = el.getBoundingClientRect();
    const containerRect = el.parentElement?.getBoundingClientRect() ?? imgRect;
    const [displayedWidth, displayedHeight] = getContainedImageSize(
      imgRect.width,
      imgRect.height,
      el.naturalWidth,
      el.naturalHeight,
    );
    const offsetX = (imgRect.width - displayedWidth) / 2;
    const offsetY = (imgRect.height - displayedHeight) / 2;
    const rawX = e.clientX - imgRect.left - offsetX;
    const rawY = e.clientY - imgRect.top - offsetY;
    const clampedX = clamp(rawX, 0, displayedWidth);
    const clampedY = clamp(rawY, 0, displayedHeight);

    // ルーペの表示位置はコンテナ基準で計算する（絶対配置の基準がコンテナのため）
    setLensXY([e.clientX - containerRect.left, e.clientY - containerRect.top]);
    // 拡大参照位置は画像内の座標で計算する
    setImageXY([clampedX, clampedY]);
    setSize([displayedWidth, displayedHeight]);
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
          top: `${lensY - magnifierHeight / 2}px`,
          left: `${lensX - magnifierWidth / 2}px`,
          backgroundSize: `${imgWidth * zoomLevel}px ${imgHeight * zoomLevel}px`,
          backgroundPositionX: `${-imageX * zoomLevel + magnifierWidth / 2}px`,
          backgroundPositionY: `${-imageY * zoomLevel + magnifierHeight / 2}px`,
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

/**
 * object-fit: contain で表示される実画像領域の幅・高さを返す
 */
function getContainedImageSize(
  boxWidth: number,
  boxHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): [number, number] {
  if (!(boxWidth > 0 && boxHeight > 0 && naturalWidth > 0 && naturalHeight > 0)) {
    return [boxWidth, boxHeight];
  }

  const scale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight);
  return [naturalWidth * scale, naturalHeight * scale];
}

/**
 * 値を指定した最小値と最大値の範囲に収める
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
