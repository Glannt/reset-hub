use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use winreg::enums::*;
use winreg::RegKey;

#[derive(Serialize, Deserialize, Clone)]
struct MultiLangString {
    vi: String,
    en: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct RegistryConfig {
    hive: String, // "HKEY_LOCAL_MACHINE" or "HKEY_CURRENT_USER"
    path: String,
    key: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct ActionConfig {
    label: MultiLangString,
    r#type: String, // "execute_binary"
    file: String,
    require_admin: bool,
}

#[derive(Serialize, Deserialize, Clone)]
struct ToolManifest {
    id: String,
    name: MultiLangString,
    description: MultiLangString,
    icon: String,
    version_check: Option<RegistryConfig>,
    actions: Vec<ActionConfig>,
}

#[derive(Serialize, Clone)]
struct ToolInfo {
    manifest: ToolManifest,
    detected_version: String,
    folder_name: String,
}

// --- HÀM XÁC ĐỊNH CHÍNH XÁC THƯ MỤC TOOLS TÙY MÔI TRƯỜNG ---
fn get_tools_dir() -> Result<PathBuf, String> {
    let mut dir = if cfg!(debug_assertions) {
        // Trong quá trình phát triển (Dev Mode): 
        // CWD của Rust thường nằm ở "src-tauri". Ta lùi 1 cấp ra thư mục gốc của dự án để tìm "tools/"
        std::env::current_dir()
            .map_err(|e| e.to_string())?
            .parent()
            .ok_or("Không thể tìm thấy thư mục làm việc cha")?
            .to_path_buf()
    } else {
        // Khi đã đóng gói Release: 
        // Lấy trực tiếp đường dẫn nằm cùng cấp với tệp chạy .exe của Hub
        std::env::current_exe()
            .map_err(|e| e.to_string())?
            .parent()
            .ok_or("Không thể xác định thư mục tệp thực thi")?
            .to_path_buf()
    };
    
    dir.push("tools");
    
    // Tự động khởi tạo thư mục tools nếu chưa tồn tại trên máy
    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
    
    Ok(dir)
}

fn check_registry_version(config: &RegistryConfig) -> String {
    let hive = match config.hive.as_str() {
        "HKEY_LOCAL_MACHINE" => RegKey::predef(HKEY_LOCAL_MACHINE),
        "HKEY_CURRENT_USER" => RegKey::predef(HKEY_CURRENT_USER),
        _ => return "Unknown Hive".to_string(),
    };

    match hive.open_subkey(&config.path) {
        Ok(key) => {
            match key.get_value::<String, _>(&config.key) {
                Ok(val) => val,
                Err(_) => {
                    match key.get_value::<u32, _>(&config.key) {
                        Ok(val) => val.to_string(),
                        Err(_) => "Installed (N/A)".to_string(),
                    }
                }
            }
        }
        Err(_) => "Not Installed".to_string(),
    }
}

#[tauri::command]
fn get_installed_tools() -> Result<Vec<ToolInfo>, String> {
    // Sử dụng hàm helper động để lấy chuẩn đường dẫn
    let tools_dir = get_tools_dir()?;

    let mut tools = Vec::new();
    if let Ok(entries) = fs::read_dir(&tools_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let manifest_path = path.join("manifest.json");
                if manifest_path.exists() {
                    if let Ok(content) = fs::read_to_string(&manifest_path) {
                        if let Ok(manifest) = serde_json::from_str::<ToolManifest>(&content) {
                            let mut detected_version = "N/A".to_string();
                            if let Some(ref rc) = manifest.version_check {
                                detected_version = check_registry_version(rc);
                            }

                            tools.push(ToolInfo {
                                manifest,
                                detected_version,
                                folder_name: path
                                    .file_name()
                                    .unwrap()
                                    .to_string_lossy()
                                    .into_owned(),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(tools)
}

#[tauri::command]
fn run_tool_action(folder_name: String, file_name: String, require_admin: bool) -> Result<String, String> {
    // Đảm bảo đường dẫn tuyệt đối an toàn
    let exe_path = get_tools_dir()?
        .join(&folder_name)
        .join(&file_name);

    if !exe_path.exists() {
        return Err(format!("Không tìm thấy file thực thi tại: {:?}", exe_path));
    }

    if require_admin {
        // Để vượt lỗi 740 (Requires Elevation), ta mượn PowerShell kích hoạt bảng hỏi UAC của Windows 
        let exe_str = exe_path.to_string_lossy().replace("\"", "`\"");
        let working_dir_str = exe_path.parent().unwrap().to_string_lossy().replace("\"", "`\"");
        
        Command::new("powershell")
            .arg("-Command")
            .arg(format!(
                "Start-Process -FilePath \"{}\" -WorkingDirectory \"{}\" -Verb RunAs",
                exe_str,
                working_dir_str
            ))
            .spawn()
            .map_err(|e| format!("Lỗi yêu cầu quyền Administrator: {}", e))?;
    } else {
        // Chạy ở mức người dùng chuẩn bình thường
        Command::new(&exe_path)
            .spawn()
            .map_err(|e| format!("Lỗi khởi chạy Tool: {}", e))?;
    }

    Ok("Chạy công cụ thành công!".to_string())
}

// --- HÀM HELPER SAO CHÉP TOÀN BỘ THƯ MỤC ĐỆ QUY ---
fn copy_dir_all(src: impl AsRef<std::path::Path>, dst: impl AsRef<std::path::Path>) -> std::io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

#[tauri::command]
fn import_tool() -> Result<String, String> {
    let folder = rfd::FileDialog::new()
        .set_title("Chọn thư mục chứa Công cụ để Thêm")
        .pick_folder();

    if folder.is_none() {
        return Err("Cancelled".to_string());
    }
    
    let folder_path = folder.unwrap();

    let manifest_path = folder_path.join("manifest.json");
    if !manifest_path.exists() {
        return Err("Thư mục không hợp lệ! Thiếu tệp cấu hình 'manifest.json' bên trong.".to_string());
    }

    let content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Không thể đọc file manifest.json: {}", e))?;

    let manifest: ToolManifest = serde_json::from_str(&content)
        .map_err(|e| format!("Tệp manifest.json không đúng định dạng JSON: {}", e))?;

    let tool_id = manifest.id.trim().to_lowercase();
    if tool_id.is_empty() {
        return Err("ID công cụ trong manifest.json đang bị bỏ trống!".to_string());
    }

    // Đường dẫn đích sử dụng cơ chế động
    let dest_dir = get_tools_dir()?.join(&tool_id);

    copy_dir_all(&folder_path, &dest_dir)
        .map_err(|e| format!("Lỗi sao chép thư mục plugin: {}", e))?;

    Ok("Đã thêm công cụ mới thành công!".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_installed_tools, run_tool_action, import_tool])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
