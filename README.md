# Website Đọc hiểu & Đối chiếu Bài báo Khoa học Tiếng Anh bằng Tiếng Việt

Ứng dụng web hỗ trợ thành viên nhóm nghiên cứu đa ngành (**Khoa học, Trí tuệ nhân tạo - AI, Thủy điện - Thủy văn - Hồ chứa và các lĩnh vực liên quan**) tải tệp PDF bài báo tiếng Anh để nhận bản phân tích chuyên sâu bằng tiếng Việt, tra cứu thuật ngữ, giải thích bảng/hình/công thức và đặt câu hỏi đối chiếu trực tiếp với vị trí trên PDF gốc.

## Đặc điểm chính
- **Không cần đăng nhập, cô lập phiên riêng tư 24 giờ:** Sinh khóa bí mật 256-bit cho từng phiên làm việc, không công khai tài liệu và không tạo thư viện chung; tự động xóa khỏi máy chủ sau 24 giờ hoặc xóa ngay khi bấm nút.
- **Đọc hiểu 3 mức độ:** *1. Hiểu nhanh (5 câu cốt lõi)* → *2. Phân tích đầy đủ (thích ứng tự động cho bài báo AI, Thủy điện hoặc ngành khoa học khác)* → *3. Đọc sâu từng mục & công thức (tùy chỉnh độ chuyên sâu)*.
- **Đối chiếu dẫn chứng hai chiều:** Phân biệt rõ số trang tệp PDF và số trang in trên bài báo; bấm thẻ dẫn chứng để cuộn và tô sáng vùng văn bản/công thức trên PDF gốc.
- **Phân lớp thông tin trung thực:** Tách bạch `[Tác giả trình bày]`, `[Diễn giải của AI]`, `[Nhận xét & Lưu ý phương pháp]` và `[Kiến thức nền ngoài bài báo]`. Đánh dấu rõ vùng scan mờ/khó đọc thay vì tự đoán số liệu.
- **Xuất thảo luận nhóm Zalo & Markdown:** Nút **Sao chép gửi Zalo** xuất văn bản sạch sẽ (không dính ký tự Markdown thô) kèm nút tải tệp `.md`.

## Chạy thử trên máy cá nhân (Local)

1. Mở tệp `.env.local` (hoặc tạo từ `.env.example`) và điền mã `GEMINI_API_KEY` lấy miễn phí từ https://aistudio.google.com/apikey:
   ```ini
   GEMINI_API_KEY=AIzaSy...
   GEMINI_MODEL=gemini-3.8-flash
   ```
2. Khởi chạy máy chủ phát triển:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt tại `http://localhost:3000` (có thể bấm **Xem mẫu minh họa** ở góc phải trên để kiểm tra ngay bố cục đối chiếu dẫn chứng).

## Chạy bộ kiểm thử tự động

```bash
npm test
```

## Triển khai công khai không cần máy chủ riêng (Railway / Render)

Dự án đã đóng gói sẵn `Dockerfile` và `railway.json` (tích hợp cả giao diện Next.js, bộ xử lý tọa độ `MuPDF`, `PDF.js` và cơ sở dữ liệu phiên `node:sqlite`):

1. Đẩy thư mục dự án lên GitHub hoặc kết nối trực tiếp với **Railway** / **Render**.
2. Cấu hình biến môi trường duy nhất bắt buộc:
   - `GEMINI_API_KEY`: Khóa Google Gemini API của nhóm.
   - *(Tùy chọn)* `GEMINI_MODEL`: Mặc định `gemini-3.8-flash`.
3. *(Khuyến nghị trên Railway/Render)* Gắn một ổ đĩa lưu tạm (Volume 5 GB) vào đường dẫn `/data` để giữ phiên ổn định qua các lần khởi động lại trong vòng 24 giờ.
