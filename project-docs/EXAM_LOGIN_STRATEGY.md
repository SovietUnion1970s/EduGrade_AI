# CHIẾN LƯỢC ĐĂNG NHẬP & QUẢN LÝ TÀI KHOẢN CHO NỀN TẢNG THI TRỰC TUYẾN

Đối với các hệ thống giáo dục và thi trực tuyến (E-testing) tại Việt Nam, luồng Đăng nhập (Login) và Đăng ký (Register) có những đặc thù rất lớn so với các trang web thương mại điện tử hoặc mạng xã hội thông thường. 

Dưới đây là bảng đối chiếu chi tiết và chiến lược đề xuất cho **EduGrade AI**.

---

## 1. BẢNG SO SÁNH: WEB THƯỜNG vs. HỆ THỐNG THI ONLINE

| Đặc điểm | Web thông thường (E-Commerce, Blog...) | Hệ thống Thi & Giáo dục trực tuyến |
| :--- | :--- | :--- |
| **Đăng ký (Registration)** | Tự do đăng ký, điền email/mật khẩu bất kỳ. | **Hạn chế tự do.** Học sinh tự đăng ký dễ tạo tài khoản ảo, viết sai tên thật, gây khó khăn cho việc quản lý sổ điểm. |
| **Xác minh danh tính** | Qua Email OTP / Phone OTP đơn giản. | **Ràng buộc mã định danh.** Phải khớp với Mã Học Sinh (Student ID) hoặc danh sách lớp chính thức do Nhà trường/Giáo viên cung cấp. |
| **Cơ chế Duy trì Phiên** | Đăng nhập một lần, ghi nhớ vĩnh viễn (Keep me logged in). | **Kiểm soát phiên chặt chẽ.** Chỉ cho phép đăng nhập trên **01 thiết bị duy nhất** tại một thời điểm để chống thi hộ. |
| **Khôi phục mật khẩu** | Tự lấy lại qua Email Link (Forgot Password). | **Giáo viên cấp lại.** Học sinh K-12 thường không sử dụng Email cá nhân thường xuyên, cần cơ chế Giáo viên reset mật khẩu trực tiếp. |
| **Tích hợp hệ thống** | Đăng nhập bằng Google, Facebook, Apple. | Tích hợp hệ thống định danh của Bộ/Sở Giáo dục (VNEDU, SMAS) hoặc tài khoản trường học (Microsoft Teams, Google Workspace). |

---

## 2. CHIẾN LƯỢC ĐĂNG NHẬP & XÁC THỰC CHO EDUGRADE AI

Để tối ưu hóa trải nghiệm thực tế tại các trường học Việt Nam, chúng tôi đề xuất chiến lược 3 lớp sau:

### Lớp 1: Kiểm soát Đăng ký & Đồng bộ Danh sách lớp (Roster Validation)
* **Đối với Giáo viên:** Cho phép tự do đăng ký bằng Email trường học (`.edu.vn`) hoặc email cá nhân.
* **Đối với Học sinh:** Áp dụng **02 phương thức tiếp cận**:
  1. **Admin/Giáo viên Import trước (Khuyên dùng):** Admin trường hoặc Giáo viên import danh sách học sinh từ file Excel (chứa Họ tên, Mã học sinh). Hệ thống tự tạo tài khoản tạm thời (Username: Mã học sinh, Mật khẩu: Số điện thoại hoặc mật khẩu mặc định). Khi học sinh đăng nhập lần đầu, bắt buộc đổi mật khẩu.
  2. **Tự đăng ký kèm Mã lớp (Join Code Binding):** Nếu học sinh tự tạo tài khoản, bắt buộc phải nhập **Join Code** (Mã lớp học 6 ký tự) ngay khi tạo tài khoản. Điều này giúp gán ngay học sinh vào đúng lớp, tránh tình trạng tài khoản "vô gia cư" trên hệ thống.

### Lớp 2: Cơ chế chống thi hộ & Chia sẻ tài khoản (Active Session Locking)
* **Single Device Login (Khóa thiết bị):** Khi học sinh đăng nhập vào tài khoản của mình trên thiết bị mới (ví dụ: điện thoại), hệ thống sẽ ngay lập tức vô hiệu hóa (Log out) phiên đăng nhập ở thiết bị cũ (máy tính) và gửi thông báo.
* **Exam Session Protection:** Nếu học sinh đang trong trạng thái làm bài thi (`status: IN_PROGRESS`), mọi nỗ lực đăng nhập từ trình duyệt khác bằng tài khoản này sẽ bị chặn hoàn toàn kèm cảnh báo gian lận.

### Lớp 3: Khôi phục tài khoản không cần Email (Password Reset Bypass)
* Xây dựng chức năng **"Đặt lại mật khẩu cho học sinh"** nằm ngay trong Trang quản lý học sinh của Giáo viên. Giáo viên có thể reset mật khẩu của một học sinh bất kỳ trong lớp về mật khẩu mặc định (ví dụ: `123456`) chỉ với 1-click mà không cần học sinh phải mở email xác nhận.

### Lớp 4: Xác thực sinh trắc học nhanh (Facial Verification - Tùy chọn nâng cao)
* Trước khi bắt đầu làm bài thi chính thức, hệ thống yêu cầu học sinh nhìn vào Camera để chụp 1 bức ảnh xác thực (Webcam Snap) nhằm đối chiếu khuôn mặt với cơ sở dữ liệu học sinh của lớp học.

---

## 3. THIẾT KẾ PHÙ HỢP VỚI BẢN VẼ PHÁT TRIỂN HIỆN TẠI
Trong codebase hiện có:
* Bảng `User` trong Prisma đã có sẵn các trường: `role` (TEACHER/STUDENT), `orgId` (cô lập dữ liệu trường học), và `status` (PENDING/ACTIVE).
* Trang đăng ký (`src/app/auth/register/page.tsx`) đã chia luồng Giáo viên & Học sinh.
* **Bước cải tiến tiếp theo:** Chúng ta sẽ bổ sung logic kiểm tra Session trùng lặp và tính năng giáo viên Reset Password nhanh khi làm Giai đoạn 2.
