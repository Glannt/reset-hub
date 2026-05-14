#RequireAdmin ; Cần quyền Admin để xóa Registry hệ thống
#include <MsgBoxConstants.au3>

; --- TIẾN HÀNH RESET IDM KHÔNG CÓ GIAO DIỆN PHỨC TẠP ---

Func RunIDMReset()
    ; 1. Buộc dừng tiến trình IDM nếu đang chạy ngầm
    While ProcessExists("IDMan.exe")
        ProcessClose("IDMan.exe")
        Sleep(300) ; Chờ giải phóng bộ nhớ
    WEnd
    
    Sleep(500)
    
    ; 2. Thực thi dọn dẹp nhánh Registry Trial
    Local $regPath = "HKEY_CURRENT_USER\Software\DownloadManager"
    
    RegDelete($regPath, "LstCheck")
    RegDelete($regPath, "AdvLog")
    RegDelete($regPath, "Email")
    RegDelete($regPath, "Serial")
    RegDelete($regPath, "FName")
    RegDelete($regPath, "LName")
    
    ; Dọn dẹp thêm một số nhánh khóa phụ nếu cần
    RegDelete("HKEY_CURRENT_USER\Software\Classes\Wow6432Node\CLSID\{7B47D80C-4195-4C63-9198-DEAB9B6884A4}") 
    
    Sleep(500)
    
    ; 3. Hiện thông báo nhỏ xác nhận thành công
    MsgBox($MB_ICONINFORMATION, "IDM Hub Agent", "Đã dọn dẹp thông tin Trial thành công! Mở lại IDM để kích hoạt 30 ngày mới.", 5)
EndFunc

; Khởi chạy logic
RunIDMReset()
