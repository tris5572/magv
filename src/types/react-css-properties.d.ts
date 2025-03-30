import "react";

declare module "react" {
  // コンポーネントに対する style プロパティへの指定において、CSS Variables やベンダープレフィックス付のプロパティも許可するための設定
  interface CSSProperties {
    // `--`で始まる任意の名前のプロパティ (= CSS Variables) を許可
    [key: `--${string}`]: string | number | undefined;
    // Safari でベンダープレフィックスが必要な `user-select` を追加
    "-webkit-user-select"?: "auto" | "text" | "none" | "contain" | "all";
  }
}
