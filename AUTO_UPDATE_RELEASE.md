# Phát hành bản cập nhật TaskFlow

Ứng dụng kiểm tra bản mới tại:

```text
https://github.com/GiangPhanNguyenTra/taskflow-management/releases/latest/download/latest.json
```

Repository hiện là public, vì vậy tester không cần tài khoản GitHub. Họ chỉ tải installer từ link bạn gửi hoặc để app tự tải bản cập nhật.

## Bản 0.1.1 — bản chuyển đổi bắt buộc

Bản build trước đó không có URL cập nhật nên không thể tự nhận cấu hình mới. Hãy build `0.1.1`, tạo Release `v0.1.1`, và gửi file `*-setup.exe` của bản này cho tất cả tester hiện có.

Nếu họ đã cài bản cũ bằng installer, chỉ cần đóng TaskFlow rồi chạy installer `0.1.1`; không cần gỡ bản cũ và dữ liệu SQLite vẫn được giữ lại. Nếu trước đây họ chỉ chạy một file `.exe` không qua installer, họ cũng nên đóng file cũ rồi cài installer này một lần.

Từ bản `0.1.1` trở đi, app sẽ tự thông báo khi bạn phát hành version mới hơn.

## Build và tạo Release 0.1.1

Chạy PowerShell từ thư mục `taskflow-desktop`:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "C:\Users\admin\.tauri\taskflow-updater.key"
npm.cmd run tauri build
```

Tạo GitHub Release có tag `v0.1.1` tại repository `GiangPhanNguyenTra/taskflow-management`, rồi upload các file trong `src-tauri\target\release\bundle\nsis\`:

- `*-setup.exe`: gửi cho người cài mới hoặc các tester đang dùng bản cũ.
- `*.nsis.zip`: gói mà app sẽ tải để tự cập nhật.
- `*.nsis.zip.sig`: file chứa chữ ký của gói cập nhật.
- `latest.json`: manifest app đọc mỗi lần kiểm tra cập nhật.

`latest.json` cho Release `v0.1.1`:

```json
{
  "version": "0.1.1",
  "notes": "Thiết lập cập nhật tự động.",
  "pub_date": "2026-10-16T10:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://github.com/GiangPhanNguyenTra/taskflow-management/releases/download/v0.1.1/TEN_FILE.nsis.zip",
      "signature": "NOI_DUNG_NGUYEN_VEN_CUA_FILE_NSIS_ZIP_SIG"
    }
  }
}
```

Trong GitHub Release, upload `latest.json` như một asset. Đừng dùng link đến file `.sig` cho trường `signature`: hãy mở file `.sig`, sao chép toàn bộ nội dung của nó vào trường này.

## Các bản tiếp theo

1. Tăng cùng một version trong `package.json`, `src-tauri/tauri.conf.json`, và `src-tauri/Cargo.toml` — ví dụ `0.1.2`.
2. Build lại với biến `TAURI_SIGNING_PRIVATE_KEY` như trên.
3. Tạo Release tag `v0.1.2`; upload `*-setup.exe`, `*.nsis.zip`, `*.nsis.zip.sig`, và `latest.json` có version `0.1.2` cùng đúng URL/chữ ký của release đó.

Giữ an toàn private key tại `C:\Users\admin\.tauri\taskflow-updater.key`. Không commit, gửi, hay upload file này.
