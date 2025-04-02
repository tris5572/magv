import { useAtomValue } from "jotai";
import { logMessageAtom } from "../atoms/log";

/**
 * ログのメッセージを表示するコンポーネント
 */
export function Log() {
  const message = useAtomValue(logMessageAtom);

  // メッセージの改行コードを br タグに変換する
  // const outputMessage = message.replace(/\n/g, "<br />");

  return (
    <div className="fixed bottom-0 left-0 max-w-30 bg-gray-300/50 text-white">
      {message.split("\n").map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </div>
  );
}
