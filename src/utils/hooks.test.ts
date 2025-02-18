// import { clearMocks, mockConvertFileSrc } from "@tauri-apps/api/mocks";
// import { act, renderHook } from "@testing-library/react";
// import { useImageSize } from "./hooks";

// afterEach(() => {
//   clearMocks();
// });

// describe("useImageSize", () => {
//   test("should return the size of the image", async () => {
//     mockConvertFileSrc("macos");

//     const { useImageSize } = await import("../utils/hooks");
//     const path = "path/to/image.png";
//     const { result } = renderHook(() => useImageSize(path));

//     expect(result.current).toBeUndefined();
//     await act(async () => {
//       await waitForNextUpdate();
//     });
//     expect(result.current).toEqual({ width: 100, height: 100 });
//   });
// });
