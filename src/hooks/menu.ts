import { useStore } from "jotai";
import { useEffect } from "react";
import { attachAppMenu } from "../utils/appMenu";

/** メニューはマウント時に登録し、レンダーから独立して状態を同期する。 */
export function useAppMenu() {
  const store = useStore();
  useEffect(() => attachAppMenu(store), [store]);
}
