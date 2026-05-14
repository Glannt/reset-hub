#pragma compile(Icon, "")
#RequireAdmin ; Đòi hỏi quyền Administrator để can thiệp Registry hệ thống
#include <GUIConstantsEx.au3>
#include <StaticConstants.au3>
#include <MsgBoxConstants.au3>
#include <Process.au3>
#include <InetConstants.au3>

; ==============================================================================
; DỰ ÁN VỪA HỌC VỪA LÀM: XÂY DỰNG ỨNG DỤNG DESKTOP AUTOIT
; CHỨC NĂNG: RESET TRIAL IDM, KIỂM TRA CẬP NHẬT, GIAO DIỆN ĐỒ HỌA (GUI)
; Tác giả: Tài liệu Hướng Dẫn Tự Học AutoIt
; ==============================================================================

; --- BƯỚC 1: KHAI BÁO CÁC BIẾN TOÀN CỤC ---
Local Const $APP_VERSION = "1.0.0"
; Đường dẫn kiểm tra phiên bản (Giả định hoặc Host trên Github)
Local Const $UPDATE_URL = "https://raw.githubusercontent.com/duongdan-ao/main/version.txt"

; --- BƯỚC 2: THIẾT KẾ GIAO DIỆN NGƯỜI DÙNG (GUI) ---
; Tạo một cửa sổ (Window) có kích thước rộng 380px, cao 270px
Local $hMainGUI = GUICreate("IDM Trial Reset Tool - v" & $APP_VERSION, 380, 270, -1, -1)
GUISetBkColor(0x111827) ; Đặt màu nền cửa sổ (Hệ Hex 0xRRGGBB - Ở đây là màu xanh đậm tối)

; Thiết lập font chữ mặc định cho toàn bộ các thành phần bên trong cửa sổ
GUISetFont(10, 400, 0, "Segoe UI")

; Tiêu đề chính của Ứng dụng
Local $lblTitle = GUICtrlCreateLabel("IDM AUTO RESET TOOL", 10, 20, 360, 30, $SS_CENTER)
GUICtrlSetFont($lblTitle, 16, 800, 0, "Segoe UI") ; Font in đậm (800) cỡ 16
GUICtrlSetColor($lblTitle, 0x6366F1) ; Chữ màu Tím/Indigo (0x6366F1)

; Phụ đề chú thích
Local $lblDesc = GUICtrlCreateLabel("Công cụ học tập tự động hóa Windows bằng AutoIt", 10, 55, 360, 20, $SS_CENTER)
GUICtrlSetColor($lblDesc, 0x9CA3AF) ; Màu chữ xám nhạt

; Đường kẻ chia vùng (Giả lập bằng cách tạo Label rỗng cao 1px và đổi màu nền)
GUICtrlCreateLabel("", 20, 85, 340, 1)
GUICtrlSetBkColor(-1, 0x374151)

; Nhãn hiển thị Trạng thái hoạt động thực tế (Status Label)
Local $lblStatus = GUICtrlCreateLabel("Sẵn sàng hoạt động.", 10, 105, 360, 25, $SS_CENTER)
GUICtrlSetFont($lblStatus, 11, 600, 0, "Segoe UI")
GUICtrlSetColor($lblStatus, 0x10B981) ; Màu xanh lá trạng thái ổn định

; Các Nút bấm (Buttons) để tương tác
Local $btnReset = GUICtrlCreateButton("🚀 BẮT ĐẦU RESET TRIAL IDM", 40, 145, 300, 45)
; Đặt nút reset làm nút nổi bật
GUICtrlSetCursor(-1, 0) ; Hiển thị con trỏ bàn tay khi rê vào

Local $btnUpdate = GUICtrlCreateButton("🔄 Kiểm Tra Cập Nhật Mới", 40, 200, 300, 35)

; Chỉ lệnh yêu cầu Hệ điều hành vẽ (hiển thị) cửa sổ GUI ra màn hình
GUISetState(@SW_SHOW, $hMainGUI)


; --- BƯỚC 3: VÒNG LẶP LẮNG NGHE SỰ KIỆN (MESSAGE LOOP) ---
; Đây là phần cốt lõi của một Desktop App. Nó chạy liên tục vô hạn để chờ người dùng click chuột.
While 1
    ; Đọc thông điệp sự kiện từ GUI
    Local $iMsg = GUIGetMsg()
    
    Switch $iMsg
        Case $GUI_EVENT_CLOSE
            ; Nếu người dùng nhấn vào dấu X màu đỏ trên góc cửa sổ -> Thoát chương trình
            Exit
            
        Case $btnReset
            ; Người dùng vừa nhấn nút Reset
            GUICtrlSetState($btnReset, $GUI_DISABLE) ; Vô hiệu hóa nút tạm thời để tránh Double Click liên tục
            
            ; Gọi hàm xử lý Logic Reset bên dưới
            RunIDMReset()
            
            GUICtrlSetState($btnReset, $GUI_ENABLE) ; Kích hoạt lại nút sau khi hoàn thành
            
        Case $btnUpdate
            ; Người dùng nhấn nút Check Update
            CheckForUpdate()
            
    EndSwitch
WEnd


; --- BƯỚC 4: ĐỊNH NGHĨA CÁC HÀM LOGIC CHỨC NĂNG ---

; Hàm xử lý việc Reset IDM
Func RunIDMReset()
    ; Cập nhật trạng thái lên GUI cho người dùng biết app không bị treo
    GUICtrlSetData($lblStatus, "Đang phát hiện và dừng IDMan.exe...")
    GUICtrlSetColor($lblStatus, 0xF59E0B) ; Đổi màu trạng thái sang màu Vàng (Đang xử lý)
    
    ; 1. Buộc dừng IDM
    While ProcessExists("IDMan.exe")
        ProcessClose("IDMan.exe")
        Sleep(500) ; Đợi 0.5 giây để IDM kịp giải phóng bộ nhớ
    WEnd
    
    Sleep(500)
    GUICtrlSetData($lblStatus, "Đang tiến hành dọn dẹp Registry Keys...")
    
    ; 2. Thực thi lệnh can thiệp Registry (Lưu ý: Cần quyền Admin)
    Local $regPath = "HKEY_CURRENT_USER\Software\DownloadManager"
    
    ; Xóa các trường giá trị liên quan đến thời hạn trial
    RegDelete($regPath, "LstCheck")
    RegDelete($regPath, "AdvLog")
    RegDelete($regPath, "Email")
    RegDelete($regPath, "Serial")
    RegDelete($regPath, "FName")
    RegDelete($regPath, "LName")
    
    ; Chờ 1 giây giả lập việc xử lý hoặc để Registry cập nhật
    Sleep(1000) 
    
    ; 3. Thông báo hoàn thành lên giao diện
    GUICtrlSetData($lblStatus, "Đã Reset Trial thành công!")
    GUICtrlSetColor($lblStatus, 0x10B981) ; Đổi lại sang màu Xanh Lá thành công
    
    ; Hiển thị hộp thoại thông báo kiểu MessageBox pop-up
    MsgBox($MB_ICONINFORMATION, "Thành Công", "Quá trình Reset đã xong! Bạn hãy khởi động lại IDM để nhận 30 ngày dùng thử.", 0, $hMainGUI)
EndFunc


; Hàm kiểm tra phiên bản cập nhật qua Internet
Func CheckForUpdate()
    GUICtrlSetData($lblStatus, "Đang kiểm tra cập nhật trên Server...")
    GUICtrlSetColor($lblStatus, 0x6366F1) ; Đổi sang màu tím xanh đang tải dữ liệu
    
    ; Sử dụng hàm Internet của AutoIt để đọc trực tiếp dữ liệu từ URL
    ; Tham số số 1 (ở cuối) bắt buộc máy tải lại trang trực tiếp chứ không lấy từ Cache trình duyệt
    Local $dData = InetRead($UPDATE_URL, 1)
    
    ; Kiểm tra xem quá trình tải dữ liệu có phát sinh lỗi nào hay không (ví dụ: Mất mạng)
    If @error Then
        GUICtrlSetData($lblStatus, "Lỗi: Không thể kết nối Internet!")
        GUICtrlSetColor($lblStatus, 0xEF4444) ; Đổi màu Đỏ thông báo lỗi
        
        MsgBox($MB_ICONERROR, "Lỗi Cập Nhật", "Không thể kiểm tra phiên bản mới. Hãy kiểm tra lại đường truyền Internet của bạn.", 0, $hMainGUI)
        Return ; Kết thúc hàm luôn, không chạy đoạn code dưới
    EndIf
    
    ; Chuyển dữ liệu dạng Nhị phân (Binary) vừa tải về thành dạng Chuỗi văn bản bình thường
    Local $sLatestVer = BinaryToString($dData)
    
    ; Tẩy sạch các khoảng trắng hoặc ký tự xuống dòng thừa thải
    $sLatestVer = StringStripWS($sLatestVer, 8)
    
    ; BIỆN PHÁP ĐỂ TEST (Vì $UPDATE_URL bên trên là link ví dụ có thể không tồn tại):
    ; Nếu bạn code thực tế, đoạn code này sẽ được lược bỏ
    If $sLatestVer == "" Then
        $sLatestVer = "1.0.1" ; Giả lập Server báo về đã có bản 1.0.1 để bạn test thử chức năng cập nhật
    EndIf
    
    ; 4. SO SÁNH PHIÊN BẢN
    If $sLatestVer == $APP_VERSION Then
        ; Phiên bản khớp nhau -> Là bản mới nhất
        GUICtrlSetData($lblStatus, "Bạn đang dùng phiên bản mới nhất.")
        GUICtrlSetColor($lblStatus, 0x10B981)
        
        MsgBox($MB_ICONINFORMATION, "Thông Báo", "Tuyệt vời! Phiên bản v" & $APP_VERSION & " bạn đang dùng hiện là mới nhất.", 0, $hMainGUI)
    Else
        ; Phiên bản khác nhau -> Có bản cập nhật
        GUICtrlSetData($lblStatus, "Phát hiện phiên bản mới: v" & $sLatestVer)
        GUICtrlSetColor($lblStatus, 0xF59E0B)
        
        ; Hiển thị Hộp thoại hỏi Có/Không (Yes/No)
        Local $iPrompt = MsgBox($MB_YESNO + $MB_ICONQUESTION, "Có Bản Cập Nhật Mới", "Đã có phiên bản v" & $sLatestVer & " mới hơn bản hiện tại (v" & $APP_VERSION & ")." & @CRLF & "Bạn có muốn mở trang tải xuống ngay không?", 0, $hMainGUI)
        
        If $iPrompt == 6 Then ; Số 6 tương ứng với mã phản hồi khi click nút "YES"
            ; Mở một đường link bất kỳ trên trình duyệt mặc định của máy tính
            ShellExecute("https://github.com/your-link-download")
        EndIf
    EndIf
EndFunc
