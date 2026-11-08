RAR 5.0 の store 方式で作成したテスト専用データ。画像は同じ 1 × 1 PNG。

- `pages.rar`: `010.png`, `002.png`, `readme.txt`
- `nested.rar`: `vol10.zip` (PNG 2枚), `vol2.rar` (`pages.rar`), `folder/__MACOSX/ignored.zip` (無視する壊れた補助ファイル)

ヘッダーとデータの CRC32 を含む。RAR の実装はモックせず、同梱の WASM で展開する。
形式の参照: https://www.rarlab.com/technote.htm
