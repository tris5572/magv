import { atom } from "jotai";

const $logMessageAtom = atom<string>("");

export const logMessageAtom = atom((get) => get($logMessageAtom));

export const addLogMessageAtom = atom(null, (get, set, message: string) => {
  set($logMessageAtom, get($logMessageAtom) + message + "\n");
});

export const clearLogMessageAtom = atom(null, (_, set) => {
  set($logMessageAtom, "");
});
