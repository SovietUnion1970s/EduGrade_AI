# KẾ HOẠCH TRIỂN KHAI GIAO DIỆN (UI/UX IMPLEMENTATION PLAN) - EDUGRADE AI

Kế hoạch này vạch ra lộ trình xây dựng giao diện người dùng (Frontend) tương ứng với các API tRPC đã hoàn thành, bám sát các tiêu chuẩn thẩm mỹ cao cấp (Sleek Dark Mode, Typography hiện đại, Micro-animations) và tối ưu hóa bối cảnh sử dụng thực tế.

---

## GIAI ĐOẠN 1: HỆ THỐNG GIAO DIỆN CHUNG & XÁC THỰC (FOUNDATION & AUTH)

### 1. Định hình Design System (CSS & Theme)
*   **Typography:** Sử dụng Google Font `Outfit` hoặc `Inter` làm font chữ mặc định thay cho font hệ thống để tạo nét thanh lịch, công nghệ.
*   **Màu sắc chủ đạo:** 
    *   Trạng thái thường: Slate (Xám đá) & Indigo (Xanh chàm).
    *   Điểm số và Đạt: Emerald (Xanh lá ngọc lục bảo).
    *   Cảnh báo và Vi phạm: Rose (Đỏ hoa hồng).
*   **Hiệu ứng:** Glassmorphism (làm mờ nền kính) cho các Panel điều khiển, bóng mờ mịn (Soft shadows).

### 2. Giao diện Đăng nhập / Đăng ký
*   **Trang Đăng ký (Register Page):** Biểu mẫu phân cấp rõ ràng giữa Giáo viên và Học sinh.
*   **Trang Đăng nhập (Login Page):** Giao diện tối giản, tối ưu trải nghiệm gõ phím.

---

## GIAI ĐOẠN 2: DASHBOARD & QUẢN LÝ LỚP HỌC (TEACHER & STUDENT PORTAL)

### 1. Bảng điều khiển của Giáo viên (Teacher Dashboard)
*   **Danh sách Lớp học:** Các thẻ (Cards) lớp học trực quan với đầy đủ thông tin: tên môn, khối lớp, sĩ số, và nút sao chép nhanh Mã tham gia (`joinCode`).
*   **Trung tâm Quản lý Lớp (Class Detail):** Xem danh sách học sinh, danh sách các đề thi đã phát, trạng thái nộp bài của cả lớp bằng biểu đồ phân phối điểm dạng sóng.

### 2. Bảng điều khiển của Học sinh (Student Dashboard)
*   **Danh sách lớp tham gia:** Giao diện đơn giản giúp học sinh theo dõi các lớp học hiện tại.
*   **Nút "Tham gia lớp mới":** Nhập nhanh mã code 6 ký tự với hiệu ứng gõ ô chữ tự động (Auto-focus 6 inputs).

---

## GIAI ĐOẠN 3: BỘ SOẠN THẢO ĐỀ THI & PHÒNG THI ONLINE (THE CORE UTILITIES)

### 1. Bộ soạn đề thi và Rubric (Assignment & Rubric Creator)
Đây là màn hình quan trọng nhất của giáo viên:
*   **Thông tin chung:** Cấu hình thời gian làm bài, chính sách xem đáp án, và chỉ thị prompt cho AI.
*   **Trình soạn câu hỏi tự luận:** Cho phép giáo viên viết câu hỏi, nhập đáp án mẫu.
*   **Trình thiết lập Rubric:** Giao diện chia điểm theo dòng (Bảng barem). Giáo viên thêm từng tiêu chí chấm điểm, từ khóa bắt buộc, điểm số tương ứng. AI sẽ dựa trực tiếp vào giao diện này để chấm điểm.

### 2. Màn hình làm bài của Học sinh (Student Exam Portal)
*   **Màn hình làm bài chống gian lận:**
    *   Chế độ Fullscreen bắt buộc.
    *   Bộ đếm ngược thời gian (Timer) trực quan cảnh báo khi sắp hết giờ.
*   **Màn hình tải ảnh bài viết (OCR Upload Uploader):**
    *   **Trải nghiệm Mobile:** Kích hoạt Camera ngay lập tức để học sinh chụp tờ giấy làm bài.
    *   **Bộ lọc ảnh lỗi:** Cảnh báo đỏ nếu hệ thống quét OCR nhanh phát hiện ảnh mờ, tối, hoặc không có chữ trước khi cho học sinh nộp bài.

---

## GIAI ĐOẠN 4: GIAO DIỆN CHẤM ĐIỂM CHI TIẾT & PHÚC KHẢO (GRADING & APPEALS)

### 1. Màn hình Đối chiếu Điểm số (Teacher Grading Dashboard)
Giáo viên xem kết quả chấm của AI để phê duyệt:
*   **Giao diện Chia cột (Split View):**
    *   *Cột Trái:* Ảnh chụp tờ giấy gốc của học sinh.
    *   *Cột Giữa:* Văn bản đã được OCR trích xuất.
    *   *Cột Phải:* Chi tiết chấm điểm của AI (Từng ý Rubric đúng/sai, số điểm AI cho, lý do phê).
*   **Nút ghi đè điểm (Teacher Override):** Giáo viên có thể click trực tiếp vào ô điểm để sửa lại, nhập lời phê của mình và lưu lại hệ thống.

### 2. Trung tâm Phúc khảo (Appeals Center)
*   **Học sinh:** Click vào câu bị chấm sai, nhập lý do phúc khảo (tối thiểu 20 ký tự) gửi giáo viên.
*   **Giáo viên:** Màn hình duyệt đơn phúc khảo, hiển thị lý do của học sinh và so sánh với lịch sử điểm cũ để đưa ra quyết định Duyệt/Từ chối sửa điểm.
