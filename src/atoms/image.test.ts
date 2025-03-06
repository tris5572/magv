// import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
// import { act, renderHook } from "@testing-library/react";
// import { openPathAtom } from "./image";
// import { useAtom } from "jotai";
// import { randomFillSync } from "crypto";

// beforeAll(() => {
//   Object.defineProperty(window, "crypto", {
//     value: {
//       // @ts-expect-error window is a browser global
//       getRandomValues: (buffer) => {
//         return randomFillSync(buffer);
//       },
//     },
//   });
// });

// afterEach(() => {
//   clearMocks();
// });

// describe("openPathAtom", () => {
//   test("画像ファイルが存在しなかったときは何もしない", async () => {
//     mockIPC((cmd) => {
//       switch (cmd) {
//         case "get_image_file_list":
//           return [];
//         default:
//           break;
//       }
//     });
//     const { result } = renderHook(() => useAtom(openPathAtom));

//     await act(async () => {
//       await result.current[1]("path/to/image.png");
//     });

//     expect(result.current).toBeUndefined();
//   });
// });
