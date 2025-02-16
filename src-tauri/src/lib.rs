/// 渡されたパスのディレクトリ内の画像ファイルの一覧を取得する
///
/// 画像であることの判定は拡張子を元にして行う
#[tauri::command]
fn get_image_file_list(path: &str) -> Vec<String> {
    let mut files = Vec::new();
    let image_extensions = vec!["jpg", "jpeg", "png", "gif", "bmp", "webp"];

    // path がファイルのときはディレクトリに変換する
    let path = if std::fs::metadata(path)
        .map(|m| m.is_file())
        .unwrap_or(false)
    {
        std::path::Path::new(path)
            .parent()
            .unwrap()
            .to_str()
            .unwrap()
    } else {
        path
    };

    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                if let Ok(file_name) = entry.file_name().into_string() {
                    // 画像ファイルのとき、フルパスにして格納する
                    if image_extensions
                        .iter()
                        .any(|ext| file_name.to_lowercase().ends_with(ext))
                    {
                        let file_name = format!("{}/{}", path, file_name);
                        files.push(file_name);
                    }
                }
            }
        }
    }
    files.sort();
    files
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_image_file_list])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
