import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { isOpeningRenameViewAtom } from "../atoms/app";
import { openingArchivePathWithoutExtension } from "../atoms/zip";

/**
 * ファイルのリネーム情報を入力するビュー
 */
export function RenameBox() {
  const [isComposing, setIsComposing] = useState(false); // 変換中かどうか
  const [, setIsOpeningView] = useAtom(isOpeningRenameViewAtom);
  const inputRef = useRef<HTMLInputElement>(null);
  const [defaultValue] = useAtom(openingArchivePathWithoutExtension);

  // 表示したとき、テキストボックスにフォーカスを当てて中身を選択する
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  /** テキストフィールドのキー押下時のイベントハンドラ */
  function handleKeyDown(event: React.KeyboardEvent) {
    // キー入力がアプリのイベントとして伝わらないようにする
    event.stopPropagation();

    // 変換中の Enter 押下時にイベントの伝播を防ぎ、ビューが閉じないようにする
    if (event.key === "Enter") {
      event.preventDefault();
    }
    // 名前が確定したときの処理（変換確定の Enter を無視する）
    if (event.key === "Enter" && !isComposing) {
      // event.preventDefault();
      // event.stopPropagation();
    }
    // Esc 押下時（変換中以外）は、変更を反映せずに閉じる
    if (event.key === "Escape" && !isComposing) {
      event.preventDefault();
      setIsOpeningView(false);
    }
  }

  return (
    <div className="absolute bottom-8 left-1/2 transform-[translateX(-50%)] bg-neutral-50/20 text-neutral-700 p-4 rounded-md">
      <div>
        <input
          type="text"
          size={100}
          className="bg-neutral-100/60 rounded-md p-1 border border-neutral-300"
          ref={inputRef}
          defaultValue={defaultValue}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => {
            // 変換確定直後にフラグがオフになり、イベントハンドラでの Enter 押下処理（変換中判定）が正しく動かないため少し遅延させる
            setTimeout(() => setIsComposing(false), 10);
          }}
        />
      </div>
      {/* <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          className="bg-neutral-100 border border-neutral-300 rounded-md px-2 py-0.5"
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="bg-neutral-300 border border-neutral-400 rounded-md px-4 py-1"
        >
          変更確定
        </button>
      </div> */}
    </div>
  );
}
