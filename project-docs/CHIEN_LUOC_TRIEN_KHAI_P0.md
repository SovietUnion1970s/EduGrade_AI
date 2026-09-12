# 🚀 CHIẾN LƯỢC TRIỂN KHAI NHÓM TÍNH NĂNG P0 (KHẨN CẤP & CỐT LÕI)
> **Dự án:** EduGrade AI — Hệ thống Chấm thi Tự luận Thông minh  
> **Tài liệu hướng dẫn:** Dành cho lập trình viên & Nhà phát triển sản phẩm  
> **Mục tiêu:** Đưa hệ thống từ phiên bản thử nghiệm (Prototype) thành sản phẩm thương mại sẵn sàng triển khai thực tế tại các trường THPT / Đại học.

---

## 📑 MỤC LỤC
1. [Tổng quan Nhóm Tính năng P0](#1-tổng-quan-nhóm-tính-năng-p0)
2. [Giải thích Khái niệm Công nghệ Mới (Cho người mới bắt đầu)](#2-giải-thích-khái-niệm-công-nghệ-mới)
   * 2.1. Cloudflare R2 / AWS S3 là gì? Tại sao phải dùng?
   * 2.2. LaTeX và KaTeX là gì?
   * 2.3. ExcelJS & Báo cáo điểm chuẩn Bộ GD&ĐT
3. [Chiến lược Kỹ thuật & Thiết kế Chi tiết Từng Tính năng](#3-chiến-lược-kỹ-thuật--thiết-kế-chi-tiết)
   * 3.1. Tính năng #1 (P0-1): Lưu trữ Cloud Thực tế (Cloudflare R2 & Local Provider)
   * 3.2. Tính năng #2 (P0-2): Soạn thảo & Hiển thị Công thức Toán KaTeX
   * 3.3. Tính năng #3 (P0-3): Xuất Báo cáo Bảng điểm Excel (.xlsx)
4. [Lộ trình & Thứ tự Thực thi Khuyên dùng](#4-lộ-trình--thứ-tự-thực-thi-khuyên-dùng)

---

## 1. TỔNG QUAN NHÓM TÍNH NĂNG P0

Nhóm P0 bao gồm **3 tính năng sống còn** cần hoàn thành trong vòng 1 - 3 tuần tới để đảm bảo tính toàn vẹn dữ liệu, mở rộng đối tượng môn học tự nhiên và cung cấp công cụ báo cáo cho giáo viên:

| STT | Mã | Tên Tính năng | Phân loại | Độ phức tạp | Tác động | Thời gian dự kiến |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| **1** | `P0-1` | **Lưu trữ Cloud Thực tế (Cloudflare R2 / S3)** | Nâng cấp Hạ tầng | 🟢 Thấp | 🔥 Sống còn | 1 - 2 ngày |
| **2** | `P0-2` | **Soạn & Hiện Công thức Toán, Lý, Hóa (KaTeX)** | Tính năng Mới | 🟡 Vừa | 🔥 Rất cao | 2 - 3 ngày |
| **3** | `P0-3` | **Xuất Bảng điểm Lớp ra Excel (.xlsx) Chuẩn Bộ** | Nâng cấp Giáo viên | 🟢 Thấp | ⭐️ Cao | 1 - 2 ngày |

```
                       ┌─────────────────────────────────────────────────────────┐
                       │            NHÓM P0: HOÀN THIỆN HỆ THỐNG CỐT LÕI          │
                       └─────────────────────────────────────────────────────────┘
                                                    │
            ┌───────────────────────────────────────┼───────────────────────────────────────┐
            ▼                                       ▼                                       ▼
     【P0-1. Lưu trữ Cloud】               【P0-2. Công thức Toán KaTeX】          【P0-3. Xuất Báo cáo Excel】
   • Lưu vĩnh viễn ảnh bài thi           • Gõ phân số, căn thức, tích phân       • Xuất file .xlsx chuẩn Bộ GD&ĐT
   • Hybrid: Local Dev ↔ Cloud R2        • Thanh công cụ trực quan Math Toolbar  • 1-Click tải về cho Giáo viên
```

---

## 2. GIẢI THÍCH KHÁI NIỆM CÔNG NGHỆ MỚI

Nếu bạn chưa từng làm việc với các công nghệ này, phần dưới đây sẽ giải thích bằng ngôn ngữ trực quan nhất.

### 2.1. Cloudflare R2 / AWS S3 là gì? Tại sao không lưu ảnh vào Server hoặc Database?

#### Vấn đề nếu làm theo cách thông thường:
1. **Nếu lưu ảnh vào Database (PostgreSQL):**
   * Database sinh ra để lưu thông tin dạng bảng (chữ, số, quan hệ).
   * Nếu nhét hàng ngàn bức ảnh (mỗi ảnh 2MB - 5MB) vào database, dung lượng database sẽ tăng lên hàng trăm Gigabyte. Tốc độ truy vấn bảng điểm sẽ chậm như rùa, chi phí thuê database rất đắt đỏ và việc sao lưu (backup) database gần như bất khả thi.
2. **Nếu lưu ảnh vào thư mục trên ổ cứng Server (như `public/uploads/`):**
   * Khi bạn triển khai web lên các nền tảng đám mây hiện đại (Vercel, Render, Railway, Docker VPS), mỗi lần bạn deploy cập nhật code mới, server sẽ bị khởi động lại (restart) $\rightarrow$ **Toàn bộ ảnh bài làm của học sinh trong thư mục đó sẽ BỊ XÓA SẠCH!**

#### Giải pháp chuẩn công nghiệp: Dùng "Object Storage" (Kho lưu trữ tệp đám mây)
* **Object Storage** là dịch vụ ổ đĩa đám mây chuyên dụng, kết nối qua mã nguồn bằng API.
* **AWS S3 (Amazon Simple Storage Service):** Tiêu chuẩn vàng thế giới từ Amazon, nhưng có nhược điểm lớn là **Phí Egress (Băng thông tải về)**. Mỗi lần giáo viên bấm xem ảnh bài làm, Amazon sẽ tính tiền tải dữ liệu.
* **Cloudflare R2 (Lựa chọn số 1 cho EduGrade AI):**
  * **Cloudflare** là tập đoàn bảo mật và hạ tầng mạng top 1 thế giới.
  * **R2** là dịch vụ lưu trữ của Cloudflare với ưu điểm vượt trội:
    1. **Miễn phí 100% phí băng thông tải về (Zero Egress Fee):** Giáo viên xem lại ảnh bài làm 10.000 lần cũng không tốn 1 đồng tiền băng thông.
    2. **Miễn phí 10 GB lưu trữ đầu tiên** mỗi tháng (đủ cho hàng chục ngàn bài thi đã nén).
    3. **Tương thích hoàn toàn chuẩn AWS S3:** Lập trình viên chỉ cần dùng thư viện chuẩn `@aws-sdk/client-s3` là chạy được. Sau này muốn đổi sang AWS, Google Cloud hay MinIO thì chỉ cần sửa cấu hình trong `.env`, không phải viết lại code.

---

### 2.2. LaTeX và KaTeX là gì? Tại sao môn Toán, Lý, Hóa lại cần?

#### Vấn đề:
* Bàn phím máy tính thông thường chỉ gõ được chữ cái và số (`a, b, c, 1, 2, 3`).
* Khi muốn biểu diễn:
  * Phân số: $\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
  * Tích phân: $\int_0^\pi \sin(x) dx = 2$
  * Hóa học: $\text{Fe} + 2\text{HCl} \rightarrow \text{FeCl}_2 + \text{H}_2\uparrow$
  Nếu gõ bằng chữ thường (`(-b + căn(b^2-4ac))/2a`), đề bài sẽ rất rối mắt, xấu và học sinh dễ đọc nhầm.

#### Giải pháp:
* **LaTeX:** Là chuẩn ngôn ngữ gõ công thức toán học số 1 toàn cầu. Người dùng gõ mã ngắn (ví dụ: `\frac{a}{b}` hoặc `\sqrt{x}`), hệ thống sẽ vẽ thành phân số và dấu căn chuẩn xác như sách giáo khoa.
* **KaTeX:** Là bộ thư viện do Khan Academy phát triển, giúp trình duyệt vẽ công thức LaTeX ra màn hình cực kỳ nhanh (nhanh hơn MathJax gấp 10 lần), hiển thị sắc nét trên cả điện thoại lẫn máy tính.
* **Bộ gõ trực quan (Math Toolbar):** Để giáo viên không phải học thuộc mã LaTeX, chúng ta sẽ tạo các nút bấm trực quan: `[ x/y ]`, `[ √x ]`, `[ x² ]`, `[ ∫ ]`. Giáo viên bấm nút nào, hệ thống tự điền mã vào ô câu hỏi.

---

### 2.3. ExcelJS & Báo cáo điểm chuẩn Bộ GD&ĐT

* **Vấn đề:** Khi kỳ thi kết thúc, giáo viên bắt buộc phải có bảng điểm để nhập lên cổng thông tin của Sở/Bộ GD&ĐT (VnEdu, SMAS) hoặc in ra nộp Ban giám hiệu.
* **ExcelJS:** Là thư viện Node.js hàng đầu giúp tạo file `.xlsx` chuyên nghiệp:
  * Kẻ khung viền bảng điểm, tô màu nền tiêu đề.
  * Tự động tính cột Xếp loại (Giỏi / Khá / Trung bình / Yếu).
  * Điền sẵn nhận xét của AI và Giáo viên.
* Giáo viên chỉ cần bấm 1 nút **"Xuất Bảng Điểm Excel"** là file tải về máy ngay lập tức.

---

## 3. CHIẾN LƯỢC KỸ THUẬT & THIẾT KẾ CHI TIẾT

---

### 3.1. TÍNH NĂNG #1 (P0-1) — LƯU TRỮ CLOUD THỰC TẾ (CLOUDFLARE R2 & LOCAL PROVIDER)

#### Kiến trúc Hybrid "Chạy Local trước, Nối Cloud sau":
Để bạn không gặp khó khăn nếu chưa có tài khoản Cloudflare R2 ngay hôm nay, chúng ta thiết kế `StorageService` theo mô hình **Provider Pattern**:

```
                              [Client Uploads File]
                                        │
                                        ▼
                           ┌─────────────────────────┐
                           │      StorageService     │
                           └─────────────────────────┘
                                        │
               ┌────────────────────────┴────────────────────────┐
               ▼ (Nếu STORAGE_DRIVER=local)                      ▼ (Nếu STORAGE_DRIVER=r2)
     ┌───────────────────┐                             ┌───────────────────┐
     │   Local Provider  │                             │    R2 Provider    │
     │ Lưu public/uploads│                             │ Đẩy lên Cloud R2  │
     └───────────────────┘                             └───────────────────┘
```

#### Quy trình xử lý dữ liệu:
1. Học sinh chụp/chọn ảnh bài làm.
2. Trình duyệt tự động nén ảnh bằng [image-compress.ts](file:///e:/EduGrade%20AI/src/lib/image-compress.ts) (giảm 90% dung lượng còn ~250KB).
3. Gửi lên endpoint `POST /api/v1/uploads/image`.
4. `StorageService` tiếp nhận:
   * **Nếu ở chế độ Local (Dev):** Lưu file vào thư mục `public/uploads/` và trả về URL `http://localhost:3000/uploads/ten_file.jpg`.
   * **Nếu ở chế độ Cloud (R2):** Đẩy lên Bucket R2 qua SDK `@aws-sdk/client-s3` và trả về URL thực tế `https://cdn.edugrade.vn/uploads/ten_file.jpg`.
5. URL ảnh thực tế được lưu vào bảng `submission_answers.answerFileUrl` trong cơ sở dữ liệu.

#### Cấu hình `.env` linh hoạt:
```env
# Chọn 'local' khi đang lập trình máy cá nhân, chuyển thành 'r2' khi deploy production
STORAGE_DRIVER=local

# Cấu hình Cloudflare R2 (Chỉ cần điền khi kích hoạt R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=edugrade-uploads
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

---

### 3.2. TÍNH NĂNG #2 (P0-2) — SOẠN THẢO & HIỂN THỊ CÔNG THỨC TOÁN, LÝ, HÓA (LATEX / KATEX)

#### Kiến trúc hiển thị công thức:
1. **Quy ước cú pháp:**
   * `$công_thức$`: Công thức nằm cùng dòng văn bản (Inline Math), ví dụ: `Cho phương trình $ax^2 + bx + c = 0$`.
   * `$$công_thức$$`: Công thức hiển thị thành một khối riêng biệt ở giữa trang (Block Math), ví dụ:
     ```markdown
     $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
     ```
2. **Cài đặt thư viện:**
   * `katex`: Bộ máy vẽ công thức.
   * `react-katex` hoặc custom component `MathRenderer`: Hiển thị công thức trong React mượt mà.
3. **Thanh công cụ Math Toolbar cho Giáo viên:**
   * Được gắn ngay phía trên ô soạn thảo câu hỏi trong trang Tạo đề thi.
   * Gồm các nút bấm nhanh:
     * `[ a/b ]`: Chèn `\frac{tử}{mẫu}`
     * `[ √x ]`: Chèn `\sqrt{x}`
     * `[ x² ]`: Chèn `x^{2}`
     * `[ x₁ ]`: Chèn `x_{1}`
     * `[ ∫ ]`: Chèn `\int_{a}^{b} f(x)dx`
     * `[ → ]`: Chèn mũi tên phản ứng hóa học `\rightarrow`
     * `[ Xem trước ]`: Bật cửa sổ Preview thời gian thực để giáo viên thấy công thức hiển thị trước khi lưu.
4. **Tích hợp vào AI Gemini OCR:**
   * Bổ sung chỉ thị cho Gemini Vision: *"Nếu bài làm của học sinh có công thức toán học hoặc phương trình hóa học, hãy tự động trích xuất dưới định dạng mã LaTeX chuẩn kẹp giữa dấu $...$ hoặc $$...$$"*.

---

### 3.3. TÍNH NĂNG #3 (P0-3) — XUẤT BÁO CÁO BẢNG ĐIỂM RA EXCEL (.XLSX) CHUẨN BỘ GD&ĐT

#### Thiết kế mẫu file Excel xuất ra:
File Excel được tạo bằng `exceljs` với giao diện chuyên nghiệp:

1. **Phần Thông tin Chung (Header):**
   * TÊN TRƯỜNG: Trường THPT Chuyên / Đại học...
   * LỚP: 12A1 | MÔN HỌC: Lịch sử | THỜI GIAN: 15 phút
   * TÊN BÀI THI: Kiểm tra định kỳ học kỳ 1
   * GIÁO VIÊN BỘ MÔN: Thầy/Cô Nguyễn Văn A
2. **Bảng Điểm Chi Tiết:**
   * Cột 1: STT
   * Cột 2: Mã học sinh
   * Cột 3: Họ và tên
   * Cột 4: Điểm tổng kết (Thang điểm 10, tô màu xanh nếu $\ge 8.0$, màu đỏ nếu $< 5.0$)
   * Cột 5: Xếp loại học lực (Giỏi / Khá / Trung bình / Chưa đạt)
   * Cột 6...N: Điểm chi tiết từng câu (Câu 1, Câu 2, Câu 3...)
   * Cột N+1: Số lần vi phạm chống gian lận (Kèm mức độ rủi ro)
   * Cột N+2: Lời phê & Đánh giá tổng quát của Giáo viên / AI
3. **Thao tác Giáo viên:**
   * Trên trang Quản lý bài tập của Giáo viên (`/teacher/assignments/[id]`), bổ sung nút bấm:
     `[ 📥 Xuất Báo Cáo Điểm Excel (.xlsx) ]`.
   * Giáo viên bấm nút $\rightarrow$ Trình duyệt tự động tải file `BangDiem_Lop12A1_MonLichSu.xlsx` về máy tính.

---

## 4. LỘ TRÌNH & THỨ TỰ THỰC THI KHUYÊN DÙNG

Để bạn dễ kiểm soát tiến độ và thấy ngay kết quả trên web, thứ tự triển khai khuyên dùng là:

```
Tuần 1: BƯỚC 1 ────────────► BƯỚC 2 ────────────► BƯỚC 3
      【Lưu trữ Ảnh Thật】    【Xuất Excel Bảng điểm】  【Công thức Toán KaTeX】
       (P0-1: 1-2 ngày)       (P0-3: 1-2 ngày)         (P0-2: 2-3 ngày)
```

### Bước 1: Triển khai Hạ tầng Lưu trữ Ảnh Thực tế (P0-1)
* **Vì sao làm trước?** Vì tính năng Nộp ảnh viết tay vừa hoàn thiện đang dùng URL giả lập `https://storage.edugrade.vn/...`. Cần gắn chỗ lưu thật ngay để ảnh không bị mất.
* **Cách làm:** Xây dựng `StorageService` hỗ trợ lưu Local vào `public/uploads/` trước (bạn test được ngay không cần thẻ Visa), sẵn sàng biến môi trường để cắm Cloudflare R2 sau này chỉ bằng 1 dòng `.env`.

### Bước 2: Triển khai Xuất Báo Cáo Bảng Điểm Excel (.xlsx) (P0-3)
* **Vì sao làm thứ hai?** Tính năng này chạy độc lập, dễ kiểm thử, xong ngay trong 1 ngày và mang lại giá trị thực tế lớn nhất cho giáo viên để nộp điểm cho nhà trường.

### Bước 3: Triển khai Soạn thảo & Hiển thị Công thức Toán KaTeX (P0-2)
* **Vì sao làm thứ ba?** Nâng cấp ô nhập liệu và bộ hiển thị công thức để mở rộng cho các môn Toán, Lý, Hóa, hoàn thiện trọn vẹn toàn bộ nhóm P0.

---

> [!TIP]
> File này đã được lưu vĩnh viễn tại [project-docs/CHIEN_LUOC_TRIEN_KHAI_P0.md](file:///e:/EduGrade%20AI/project-docs/CHIEN_LUOC_TRIEN_KHAI_P0.md) trong thư mục dự án của bạn để bạn có thể mở ra đọc bất kỳ lúc nào!
