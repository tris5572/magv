use serde::Deserialize;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager};

#[derive(Debug, Deserialize)]
struct WindowConfig {
    window: Option<WindowState>,
}

#[derive(Debug, Deserialize)]
struct WindowState {
    position: Option<WindowPosition>,
    size: Option<WindowSize>,
}

#[derive(Debug, Deserialize)]
struct WindowPosition {
    x: f64,
    y: f64,
}

#[derive(Debug, Deserialize)]
struct WindowSize {
    width: f64,
    height: f64,
}

#[derive(Clone, Copy)]
struct LogicalRect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

impl LogicalRect {
    fn contains(self, x: f64, y: f64) -> bool {
        x >= self.x && x <= self.x + self.width && y >= self.y && y <= self.y + self.height
    }
}

fn clamp_window_position(
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    monitor: LogicalRect,
) -> (f64, f64) {
    let max_x = monitor.x + (monitor.width - width).max(0.0);
    let max_y = monitor.y + (monitor.height - height).max(0.0);
    let clamped_x = x.clamp(monitor.x, max_x);
    let clamped_y = y.clamp(monitor.y, max_y);
    (clamped_x, clamped_y)
}

fn monitor_logical_rects(app: &AppHandle, window: &tauri::WebviewWindow) -> Vec<LogicalRect> {
    let Ok(monitors) = app.available_monitors() else {
        return Vec::new();
    };

    monitors
        .iter()
        .map(|monitor| {
            let factor = monitor.scale_factor();
            let position = monitor.position();
            let size = monitor.size();
            LogicalRect {
                x: position.x as f64 / factor,
                y: position.y as f64 / factor,
                width: size.width as f64 / factor,
                height: size.height as f64 / factor,
            }
        })
        .chain(window.current_monitor().ok().flatten().map(|monitor| {
            let factor = monitor.scale_factor();
            let position = monitor.position();
            let size = monitor.size();
            LogicalRect {
                x: position.x as f64 / factor,
                y: position.y as f64 / factor,
                width: size.width as f64 / factor,
                height: size.height as f64 / factor,
            }
        }))
        .collect()
}

fn restore_main_window_config(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let Ok(config_dir) = app.path().app_config_dir() else {
        let _ = window.show();
        return;
    };

    let config_path = config_dir.join("window.json");
    let Ok(content) = std::fs::read_to_string(config_path) else {
        let _ = window.show();
        return;
    };

    if let Ok(config) = serde_json::from_str::<WindowConfig>(&content) {
        let restored_size = config.window.as_ref().and_then(|v| v.size.as_ref());
        if let Some(size) = restored_size {
            let _ = window.set_size(LogicalSize::new(size.width, size.height));
        }

        if let Some(position) = config.window.as_ref().and_then(|v| v.position.as_ref()) {
            let window_size = if let Some(size) = restored_size {
                (size.width, size.height)
            } else {
                let factor = window.scale_factor().unwrap_or(1.0);
                match window.inner_size() {
                    Ok(size) => {
                        let logical = size.to_logical::<f64>(factor);
                        (logical.width, logical.height)
                    }
                    Err(_) => (640.0, 480.0),
                }
            };

            let monitors = monitor_logical_rects(app, &window);

            let target_monitor = monitors
                .iter()
                .find(|monitor| monitor.contains(position.x, position.y))
                .copied()
                .or_else(|| monitors.first().copied());

            let corrected = if let Some(monitor) = target_monitor {
                clamp_window_position(
                    position.x,
                    position.y,
                    window_size.0,
                    window_size.1,
                    monitor,
                )
            } else {
                (position.x, position.y)
            };

            let _ = window.set_position(LogicalPosition::new(corrected.0, corrected.1));
        }
    }

    let _ = window.show();
}

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

/// 渡されたパス（ディレクトリまたはファイル）のディレクトリ内にある zip ファイルのリストを返す
#[tauri::command]
fn get_archive_file_list(path: &str) -> Vec<String> {
    let mut files = Vec::new();

    let archive_extensions = vec!["zip"];

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
    tauri::Builder::default()
        .setup(|app| {
            restore_main_window_config(app.handle());
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
