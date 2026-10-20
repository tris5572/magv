use tauri::Manager;

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

/// 渡されたパス（ディレクトリまたはファイル）のディレクトリ内にあるアーカイブファイルのリストを返す
#[tauri::command]
fn get_archive_file_list(path: &str) -> Vec<String> {
    let mut files = Vec::new();

    let archive_extensions = vec!["zip", "rar"];

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
                    // 圧縮ファイルのとき、フルパスにして格納する
                    if archive_extensions
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
    let builder = tauri::Builder::default();

    #[cfg(desktop)]
    let builder = builder.plugin(
        tauri_plugin_window_state::Builder::default()
            .with_state_flags(
                tauri_plugin_window_state::StateFlags::POSITION
                    | tauri_plugin_window_state::StateFlags::SIZE,
            )
            .build(),
    );

    builder
        .setup(|app| {
            // プラグインによる位置・サイズの復元後に表示する。
            if let Some(window) = app.get_webview_window("main") {
                window.show()?;
            }
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_image_file_list,
            get_archive_file_list
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
