import { useAtomValue } from "jotai";
import { logMessageAtom } from "../atoms/log";

const WRAPPER_STYLE: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  maxWidth: "30rem",
  backgroundColor: "rgba(128, 128, 128, 0.5)",
  color: "white",
};

/**
 * ログのメッセージを表示するコンポーネント
 */
export function Log() {
  const message = useAtomValue(logMessageAtom);

  // メッセージの改行コードを br タグに変換する
  // const outputMessage = message.replace(/\n/g, "<br />");

  return (
    <div style={WRAPPER_STYLE}>
      {message.split("\n").map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </div>
  );
}
