import { atom } from "jotai";

export const handleWindowMoveAtom = atom(
  null,
  (get, set, value: { x: number; y: number }) => {
    console.log(value);
  }
);
