import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { isOpeningRenameViewAtom } from "../atoms/app";
import {
  handleAppEvent,
  nextArchiveNameWithoutExtensionAtom,
  openingArchivePathWithoutExtension,
  prevArchiveNameWithoutExtensionAtom,
} from "../atoms/zip";
import { AppEvent } from "../types/event";

/**
 * ファイルのリネーム情報を入力するビュー
 *
 * テキストボックスにフォーカスを当てる useEffect をビューの表示時に発火させるため、外部で表示/非表示を切り替える
 */
export function RenameBox() {
  const [isComposing, setIsComposing] = useState(false); // 変換中かどうか
  const setIsOpeningView = useSetAtom(isOpeningRenameViewAtom);
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultValue = useAtomValue(openingArchivePathWithoutExtension);
  const prevFileName = useAtomValue(prevArchiveNameWithoutExtensionAtom);
  const nextFileName = useAtomValue(nextArchiveNameWithoutExtensionAtom);
  const handleZip = useSetAtom(handleAppEvent);

  // 表示したとき、テキストボックスにフォーカスを当てて中身を選択する
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  /** テキストフィールドのキー押下時のイベントハンドラ */
  function handleKeyDown(event: React.KeyboardEvent) {
    // キー入力がアプリのイベントとして伝わらないようにする
    event.stopPropagation();

    // 変換中以外で Enter が押されたときにリネームする
    if (event.key === "Enter" && !isComposing) {
      const value = inputRef.current?.value;
      if (!value) {
        return;
      }
      // ファイル名変更イベントを発火し、リネームビューを閉じる
      handleZip({ event: AppEvent.RENAME_ARCHIVE, payload: value });
      setIsOpeningView(false);
    }
    // Esc 押下時（変換中以外）は、変更を反映せずに閉じる
    if (event.key === "Escape" && !isComposing) {
      event.preventDefault();
      setIsOpeningView(false);
    }
  }

  return (
    <div className="absolute bottom-8 left-1/2 transform-[translateX(-50%)] bg-neutral-50/60 text-neutral-700 backdrop-blur-sm p-4 rounded-md">
      <div>
        <div className="pl-1 text-neutral-700">{prevFileName}</div>
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
      <div className="pl-1 text-neutral-700">{nextFileName}</div>
    </div>
  );
}
