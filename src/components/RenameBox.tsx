import { useAtomValue, useSetAtom } from "jotai";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { isOpeningRenameViewAtom } from "../atoms/app";
import {
  handleAppEvent,
  nextSourceNameWithoutExtensionAtom,
  openingSourcePathWithoutExtension,
  prevSourceNameWithoutExtensionAtom,
} from "../atoms/source";
import { AppEvent } from "../types/event";

/** リネームボックスのスタイル */
const RENAME_BOX_STYLE: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  minWidth: "20%",
  maxWidth: "30%",
  backgroundColor: "hsl(0 0% 100% / 0.6)",
  color: "hsl(180 10% 5%)",
  backdropFilter: "blur(8px)",
  padding: "1rem",
  borderRadius: "0.5rem",
};

/** ファイル名のスタイル */
const FILE_NAME_STYLE: CSSProperties = {
  paddingLeft: "0.25rem",
  fontSize: "1.3rem",
};

/** テキストボックスのスタイル */
const TEXT_BOX_STYLE: CSSProperties = {
  width: "100%",
  backgroundColor: "hsl(0 0% 100% / 0.6)",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.25rem",
  margin: "0.25rem 0",
  border: "1px solid hsl(180 10% 50%)",
  fontSize: "1.4rem",
};

/**
 * ファイルのリネーム情報を入力するビュー
 *
 * テキストボックスにフォーカスを当てる useEffect をビューの表示時に発火させるため、外部で表示/非表示を切り替える
 */
export function RenameBox() {
  const [isComposing, setIsComposing] = useState(false); // 変換中かどうか
  const setIsOpeningView = useSetAtom(isOpeningRenameViewAtom);
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultValue = useAtomValue(openingSourcePathWithoutExtension);
  const prevFileName = useAtomValue(prevSourceNameWithoutExtensionAtom);
  const nextFileName = useAtomValue(nextSourceNameWithoutExtensionAtom);
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
    <div style={RENAME_BOX_STYLE}>
      <div>
        <div style={FILE_NAME_STYLE}>{prevFileName}</div>
        <div>
          <input
            type="text"
            style={TEXT_BOX_STYLE}
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
        <div style={FILE_NAME_STYLE}>{nextFileName}</div>
      </div>
    </div>
  );
}
