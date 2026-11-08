import type { ImageData } from "../types/data";

/** 展開画像の Blob サイズで容量を制限する LRU キャッシュ。表示中の画像は別途保持する。 */
export class ArchiveImageCache {
  private entries = new Map<string, { images: ImageData[]; bytes: number }>();
  private bytes = 0;

  constructor(
    private maxBytes = 256 * 1024 * 1024,
    private maxEntries = 3,
  ) {}

  has(path: string): boolean {
    return this.entries.has(path);
  }

  get(path: string): ImageData[] | undefined {
    const entry = this.entries.get(path);
    if (!entry) return undefined;
    this.entries.delete(path);
    this.entries.set(path, entry);
    return entry.images;
  }

  set(path: string, images: ImageData[]): void {
    const previous = this.entries.get(path);
    if (previous) {
      this.bytes -= previous.bytes;
      this.entries.delete(path);
    }
    const bytes = images.reduce((sum, image) => {
      return sum + (image.source instanceof Blob ? image.source.size : 0);
    }, 0);
    // 大容量のまとめファイルは表示用の参照だけで保持し、キャッシュには残さない。
    if (bytes > this.maxBytes) return;
    this.entries.set(path, { images, bytes });
    this.bytes += bytes;
    while (this.bytes > this.maxBytes || this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.bytes -= this.entries.get(oldest)!.bytes;
      this.entries.delete(oldest);
    }
  }
}
