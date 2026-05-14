const { invoke } = window.__TAURI__.core;

// --- 1. DICTIONARY CHO ĐA NGÔN NGỮ TĨNH (Static UI) ---
const i18n = {
    vi: {
        nav_menu: "Menu Chính",
        nav_dashboard: "Bảng Điều Khiển",
        nav_refresh: "Quét Lại Hệ Thống",
        nav_settings: "Cài Đặt Hệ Thống",
        status_active: "Hệ thống đã sẵn sàng",
        header_title: "Hộp Công Cụ Tiện Ích",
        header_desc: "Quản lý, kiểm tra phiên bản và chạy các tác vụ dọn dẹp nâng cao an toàn.",
        btn_add: "Thêm Tool Mới",
        msg_scanning: "Đang quét các plugin hệ thống...",
        msg_empty_title: "Chưa Có Công Cụ Nào",
        msg_empty_desc: "Vui lòng nhấn 'Thêm Tool Mới' hoặc thả thư mục plugin vào thư mục /tools của ứng dụng.",
        card_version: "Bản cài: ",
        toast_run_success: "Đã kích hoạt công cụ thành công!",
        toast_run_error: "Lỗi khi kích hoạt công cụ!",
        toast_refresh: "Đã cập nhật lại danh sách công cụ!",
        modal_desc_title: "Mô Tả Chi Tiết",
        modal_specs_title: "Thông Số Tương Tác Hệ Thống",
        modal_actions_title: "Danh Sách File Thực Thi Kích Hoạt",
        modal_raw_json: "🔑 Xem Tệp Cấu Hình Động (JSON Manifest)"
    },
    en: {
        nav_menu: "Main Menu",
        nav_dashboard: "Dashboard",
        nav_refresh: "Rescan System",
        nav_settings: "System Settings",
        status_active: "System is ready",
        header_title: "Utility Toolbox",
        header_desc: "Manage, check versions, and securely execute advanced maintenance tasks.",
        btn_add: "Add New Tool",
        msg_scanning: "Scanning system plugins...",
        msg_empty_title: "No Tools Found",
        msg_empty_desc: "Please click 'Add New Tool' or place plugin folders inside the app's /tools directory.",
        card_version: "Installed: ",
        toast_run_success: "Tool executed successfully!",
        toast_run_error: "Failed to execute tool!",
        toast_refresh: "Tool list updated!",
        modal_desc_title: "Detailed Description",
        modal_specs_title: "System Interaction Parameters",
        modal_actions_title: "Executable Execution List",
        modal_raw_json: "🔑 View Dynamic Configuration File (JSON Raw)"
    }
};

// --- 2. KHAI BÁO STATE (TRẠNG THÁI) ỨNG DỤNG ---
let currentLang = "vi";
let loadedTools = [];

// --- 3. CÁC HÀM HELPER (TIỆN ÍCH) ---

// Đổi ngôn ngữ giao diện
function setLanguage(lang) {
    currentLang = lang;
    
    // Cập nhật UI nút chọn
    document.getElementById("lang-vi").classList.toggle("active", lang === "vi");
    document.getElementById("lang-en").classList.toggle("active", lang === "en");

    // Dịch các thành phần HTML tĩnh có thuộc tính data-i18n
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (i18n[lang][key]) {
            el.textContent = i18n[lang][key];
        }
    });

    // Render lại thẻ công cụ để dịch nội dung bên trong
    renderTools();
}

// Hiển thị Toast Notification nổi
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    const iconClass = type === "success" ? "fa-check-circle" : "fa-exclamation-triangle";
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Tự hủy sau 4 giây
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(20px)";
        toast.style.transition = "all 0.3s";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- 4. GIAO TIẾP BACKEND (RUST INVOKES) ---

// Gọi Rust quét tool và cập nhật danh sách
async function loadToolsFromServer(silent = false) {
    const grid = document.getElementById("tools-grid");
    const spinner = document.getElementById("loading-spinner");
    const empty = document.getElementById("empty-state");

    if (!silent) {
        grid.classList.add("hidden");
        empty.classList.add("hidden");
        spinner.classList.remove("hidden");
    }

    try {
        // Gọi Rust Command
        loadedTools = await invoke("get_installed_tools");
        console.log("Loaded Tools:", loadedTools);
        
        renderTools();
        
        if (!silent && loadedTools.length > 0) {
            showToast(i18n[currentLang].toast_refresh, "success");
        }
    } catch (error) {
        console.error("Failed to fetch tools:", error);
        showToast("Lỗi nạp Plugin: " + error, "error");
    } finally {
        spinner.classList.add("hidden");
    }
}

// Render HTML các Card công cụ
function renderTools() {
    const grid = document.getElementById("tools-grid");
    const empty = document.getElementById("empty-state");
    
    grid.innerHTML = "";
    
    if (loadedTools.length === 0) {
        grid.classList.add("hidden");
        empty.classList.remove("hidden");
        return;
    }
    
    grid.classList.remove("hidden");
    empty.classList.add("hidden");

    loadedTools.forEach(item => {
        const card = document.createElement("div");
        card.className = "tool-card";
        
        const manifest = item.manifest;
        const name = manifest.name[currentLang] || manifest.name["en"];
        const desc = manifest.description[currentLang] || manifest.description["en"];
        
        // Xác định CSS badge cho version status
        const isNotInstalled = item.detected_version.toLowerCase().includes("not");
        const badgeClass = isNotInstalled ? "tool-version-badge not-installed" : "tool-version-badge";
        
        // Xây dựng danh sách nút hành động
        let actionsHtml = "";
        manifest.actions.forEach(act => {
            const label = act.label[currentLang] || act.label["en"];
            const reqAdmin = act.require_admin ? "true" : "false";
            actionsHtml += `
                <button class="btn-action" onclick="triggerAction('${item.folder_name}', '${act.file}', ${reqAdmin})">
                    ${label}
                </button>
            `;
        });

        card.innerHTML = `
            <div class="btn-card-info" onclick="event.stopPropagation(); window.openToolDetail('${item.folder_name}')">
                <i class="fa-solid fa-circle-info"></i>
            </div>
            <div class="card-header">
                <div class="tool-icon-container">
                    <img class="tool-icon" src="${manifest.icon}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/888/888853.png'" alt="icon"/>
                </div>
                <div class="tool-title-area">
                    <h3 class="tool-title">${name}</h3>
                    <span class="${badgeClass}">
                        <i class="fa-solid fa-microchip"></i> ${i18n[currentLang].card_version}${item.detected_version}
                    </span>
                </div>
            </div>
            <p class="tool-desc">${desc}</p>
            <div class="card-actions">
                ${actionsHtml}
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// Hàm kích hoạt gọi Action chạy file .exe
window.triggerAction = async function(folderName, fileName, requireAdmin) {
    try {
        showToast(i18n[currentLang].toast_run_success, "success");
        
        // Gọi lệnh Rust chạy exe độc lập với tùy chọn cấp quyền
        const response = await invoke("run_tool_action", { folderName, fileName, requireAdmin });
        console.log(response);
    } catch (error) {
        console.error("Action error:", error);
        showToast(i18n[currentLang].toast_run_error + " " + error, "error");
    }
};

// Hàm hiển thị Modal thông tin chi tiết đầy đủ của Tool
window.openToolDetail = function(folderName) {
    const tool = loadedTools.find(t => t.folder_name === folderName);
    if (!tool) return;

    const manifest = tool.manifest;
    const name = manifest.name[currentLang] || manifest.name["en"];
    const desc = manifest.description[currentLang] || manifest.description["en"];

    // Gắn thông tin cơ bản
    document.getElementById("modal-tool-name").textContent = name;
    document.getElementById("modal-tool-desc").textContent = desc;
    document.getElementById("modal-icon").src = manifest.icon;
    
    const verEl = document.getElementById("modal-tool-version");
    verEl.innerHTML = `<i class="fa-solid fa-microchip"></i> ${i18n[currentLang].card_version}${tool.detected_version}`;
    const isNotInstalled = tool.detected_version.toLowerCase().includes("not");
    verEl.className = isNotInstalled ? "tool-version-badge not-installed" : "tool-version-badge";

    // Gắn thông số Kỹ thuật
    const rc = manifest.version_check;
    document.getElementById("spec-hive").textContent = rc ? rc.hive : "N/A";
    document.getElementById("spec-path").textContent = rc ? rc.path : "N/A";
    document.getElementById("spec-key").textContent = rc ? rc.key : "N/A";
    document.getElementById("spec-folder").textContent = `/tools/${tool.folder_name}`;

    // Đổ danh sách File thực thi
    const actionsList = document.getElementById("modal-actions-list");
    actionsList.innerHTML = "";
    manifest.actions.forEach(act => {
        const actLabel = act.label[currentLang] || act.label["en"];
        const adminBadge = act.require_admin ? `<span class="admin-badge"><i class="fa-solid fa-shield-halved"></i> Admin</span>` : "";
        
        const row = document.createElement("div");
        row.className = "modal-action-row";
        row.innerHTML = `
            <div class="modal-action-info">
                <span class="action-name">${actLabel}</span>
                <span class="action-file"><i class="fa-solid fa-code-commit"></i> ${act.file}</span>
            </div>
            ${adminBadge}
        `;
        actionsList.appendChild(row);
    });

    // Gắn dữ liệu Manifest thô định dạng đẹp
    document.getElementById("modal-raw-code").textContent = JSON.stringify(manifest, null, 2);
    
    // Reset lại thẻ details
    document.querySelector(".raw-details").removeAttribute("open");

    // Hiện Modal
    document.getElementById("tool-detail-modal").classList.remove("hidden");
};

window.closeToolDetail = function() {
    document.getElementById("tool-detail-modal").classList.add("hidden");
};

// --- 5. KHỞI TẠO & BẮT SỰ KIỆN ---
window.addEventListener("DOMContentLoaded", () => {
    // Khởi chạy Ngôn ngữ mặc định
    setLanguage("vi");

    // Bắt sự kiện đổi ngôn ngữ
    document.getElementById("lang-vi").addEventListener("click", () => setLanguage("vi"));
    document.getElementById("lang-en").addEventListener("click", () => setLanguage("en"));

    // Bắt sự kiện quét lại danh sách
    document.getElementById("btn-refresh-tools").addEventListener("click", () => {
        loadToolsFromServer(false);
    });

    // Bắt sự kiện đóng Modal
    document.getElementById("btn-close-modal").addEventListener("click", window.closeToolDetail);
    document.getElementById("tool-detail-modal").addEventListener("click", (e) => {
        if (e.target.id === "tool-detail-modal") {
            window.closeToolDetail();
        }
    });

    // Nút Add Tool Mới: Gọi Rust để mở dialog chọn thư mục
    document.getElementById("btn-add-tool").addEventListener("click", async () => {
        try {
            // Gọi lệnh Rust
            const msg = await invoke("import_tool");
            
            // Nếu thành công (không ném lỗi)
            showToast(msg, "success");
            
            // Tự động quét lại toàn bộ danh sách để hiển thị tool mới ngay tức khắc!
            setTimeout(() => {
                loadToolsFromServer(true);
            }, 800);
        } catch (error) {
            // Lỗi hoặc người dùng nhấn Hủy (Cancel)
            if (error !== "Cancelled") {
                showToast(error, "error");
            }
        }
    });

    // Lần đầu load danh sách plugin từ hệ thống
    setTimeout(() => {
        loadToolsFromServer(true);
    }, 500);
});
