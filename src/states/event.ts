import { atom } from "jotai";

export const handleWindowMoveAtom = atom(
  null,
  (get, set, value: { x: number; y: number }) => {
    console.log(value);
  }
);

export const handleWindowResizeAtom = atom(
  null,
  (get, set, value: { width: number; height: number }) => {
    console.log(value);
  }
);
