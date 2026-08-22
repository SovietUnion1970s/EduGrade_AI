# PHƯƠNG ÁN TỐI ƯU CHI PHÍ TOKEN, BẢO VỆ "THIÊN TÀI" & PHÒNG NGỪA LỖI SẢN PHẨM CHÍ MẠNG (EDUGRADE AI)

Tài liệu này phân tích chi tiết các thách thức về mặt chi phí vận hành AI (Token Cost) và đề xuất các giải pháp kỹ thuật cụ thể nhằm tối ưu hóa ngân sách của nhà trường nhưng vẫn đảm bảo độ tin cậy tuyệt đối (độ chính xác của điểm số tự luận).

---

## PHẦN 1: CÁC VẤN ĐỀ VỀ CHI PHÍ TOKEN & GIẢI PHÁP TỐI ƯU

### 1. Vấn đề: Phí Prompt Token lặp lại quá nhiều
* **Nguyên nhân:** Khi chấm bài, mỗi câu trả lời của học sinh đều cần gửi kèm: Câu hỏi, Đáp án mẫu, Hướng dẫn chấm (Rubric), Chỉ thị chấm điểm của giáo viên. Nếu lớp có 40 học sinh, các thông tin này bị gửi lại 40 lần, gây lãng phí rất lớn.
* **Giải pháp:**
  1. **Gemini Context Caching:** Lưu cache đề thi và bộ Rubric trực tiếp trên máy chủ Google (thời gian sống từ 5-30 phút). Các request chấm bài của cả lớp chỉ cần tham chiếu đến ID cache này. Giảm chi phí Prompt Token lên tới **84%**.
  2. **Gom lô bài làm (Request Batching):** Gom 5-10 câu trả lời ngắn của học sinh vào một request duy nhất để AI chấm hàng loạt, giảm hao phí System Prompt.

### 2. Vấn đề: Sử dụng sai mô hình (Over-provisioning)
* **Nguyên nhân:** Chấm các câu điền từ hoặc tự luận ngắn bằng mô hình siêu lớn (như GPT-4o hoặc Gemini 1.5 Pro) gây lãng phí ngân sách.
* **Giải pháp (Model Routing):**
  * **Chấm thuần mã nguồn (0 Token):** Hệ thống tự chấm 0 điểm các bài nộp trống hoặc chứa ký tự vô nghĩa (tiền lọc).
  * **Mô hình siêu rẻ (Gemini 1.5 Flash):** Áp dụng cho câu trắc nghiệm phức tạp, điền vào chỗ trống, tự luận ngắn (< 150 từ).
  * **Mô hình chuyên sâu (Gemini 1.5 Pro):** Chỉ kích hoạt khi chấm các câu làm văn dài, bài luận tiếng Anh đòi hỏi lập luận logic sâu sắc.

---

## PHẦN 2: BẢO VỆ HỌC SINH SÁNG TẠO (TRÁNH PHẠT OAN "THIÊN TÀI")

AI thường hoạt động theo khuôn mẫu từ khóa. Nếu một học sinh có lập luận cực kỳ sáng tạo, thông minh nhưng sử dụng cách hành văn phi truyền thống (không chứa chính xác các từ khóa trong Rubric), AI có thể chấm 0 điểm. Đây là một điểm cực kỳ phản giáo dục nếu không được xử lý.

### 1. Nhãn Phân Loại Bài Làm (Thay vì dùng khái niệm "Độ tự tin")
Hệ thống không hiển thị nhãn "AI tự tin thấp" (gây mất uy tín hệ thống), thay vào đó AI sẽ gán nhãn trạng thái bài làm:
* **"Bài làm chuẩn mực" (Standard):** Bài viết đi thẳng vào vấn đề, khớp các barem thông thường. AI tự động duyệt điểm.
* **"Bài làm phức tạp / Hành văn phi truyền thống" (Complex/Non-traditional):** AI nhận diện bài viết có cấu trúc lập luận đặc biệt hoặc sử dụng từ đồng nghĩa cao cấp. Hệ thống tự động chuyển bài này sang **Trạng thái Chờ duyệt (Pending Review)** với độ ưu tiên cao, kèm theo ghi chú cho giáo viên: *"Học sinh có cách lập luận độc đáo, đề xuất giáo viên xem xét trực tiếp để tránh chấm sót ý tưởng"*.

### 2. Prompt Hai Giai Đoạn (Two-Phase Prompting)
Khi viết Prompt chấm điểm, chúng ta ép AI thực hiện:
* **Giai đoạn 1 (Semantic Analysis):** Đọc hiểu ý nghĩa cốt lõi của bài viết của học sinh, trả lời câu hỏi: *"Bài làm này có chứng minh được kiến thức yêu cầu không, dù viết bằng cách khác?"*
* **Giai đoạn 2 (Mapping Rubric):** So khớp ý nghĩa đó với Rubric. Nếu khớp về mặt bản chất nhưng lệch từ khóa, AI vẫn ghi nhận điểm và ghi chú *"Khớp ngữ nghĩa (Semantic Match)"*.

---

## PHẦN 3: PHÂN TÍCH CÁC TÌNH HUỐNG LỖI SẢN PHẨM CHÍ MẠNG TRONG THỰC TẾ (FATAL PRODUCT FLAWS)

Để tránh các tình huống thiết kế "ngây ngô" khiến sản phẩm thất bại khi đưa vào trường học, dưới đây là 5 kịch bản chí mạng và giải pháp xử lý triệt để của EduGrade AI:

### Tình huống 1: Học sinh nộp ảnh lỗi/mờ để kéo dài thời gian làm bài
* **Kịch bản chí mạng:** Học sinh đến giờ nộp bài nhưng chưa làm xong. Học sinh chụp một bức ảnh đen sì, mờ tịt, hoặc một tờ giấy trắng rồi nộp lên. Sau khi hết hạn, học sinh đổ lỗi: *"Ảnh của em bị lỗi mạng/camera hỏng, thầy cô cho em nộp lại qua Zalo nhé"*. Lúc này giáo viên buộc phải nhận bài và học sinh có thêm vài tiếng để làm bài.
* **Giải pháp của EduGrade AI:** **Real-time Validation khi Upload**.
  * Ngay khi học sinh bấm tải ảnh lên, hệ thống chạy một tác vụ OCR nhanh trong 2 giây để quét mật độ chữ và độ tương phản của ảnh chụp.
  * Nếu ảnh không có chữ hoặc độ mờ vượt ngưỡng (Blurry Image), giao diện lập tức từ chối nhận ảnh và cảnh báo: *"Ảnh chụp không rõ chữ hoặc bị mờ. Vui lòng chụp lại rõ nét hơn để nộp bài."* Học sinh không thể lấy lý do lỗi ảnh sau khi hết giờ.

### Tình huống 2: Học sinh chia sẻ ảnh bài làm cho nhau (Gian lận nhóm)
* **Kịch bản chí mạng:** Học sinh A làm xong bài trên giấy, chụp ảnh lại. Học sinh B và C lười làm, xin ảnh của A rồi tải chính bức ảnh đó lên tài khoản của mình. AI nếu chỉ đọc chữ và chấm điểm sẽ cho cả 3 bạn điểm như nhau mà không phát hiện ra họ dùng chung 1 bức ảnh.
* **Giải pháp của EduGrade AI:** **So khớp mã băm hình ảnh (Perceptual Hashing - pHash)**.
  * Mỗi khi ảnh bài làm được tải lên, hệ thống sẽ tính toán mã băm nhận thức (pHash) của bức ảnh và lưu vào DB.
  * Khi có bài nộp mới, hệ thống so khớp mã pHash của bài đó với tất cả các bài đã nộp trong cùng lớp học. Nếu độ tương đồng hình ảnh vượt quá **90%**, hệ thống lập tức gắn cờ gian lận (`Anti-cheat Risk: HIGH`) và báo cáo cho giáo viên: *"Bài làm sử dụng chung hình ảnh với học sinh A"*.

### Tình huống 3: Ràng buộc camera khi nộp bài trên di động (Mobile Photo Cheat)
* **Kịch bản chí mạng:** Học sinh làm bài kiểm tra trên máy tính, nhưng dùng điện thoại tìm kiếm đáp án trên mạng, chụp ảnh màn hình điện thoại hoặc tải ảnh lời giải trên mạng về máy, sau đó tải file ảnh đó lên để nộp.
* **Giải pháp của EduGrade AI:** 
  * Trên các thiết bị di động, thẻ `<input>` tải file ảnh bài làm lên sẽ được cấu hình thuộc tính bắt buộc dùng Camera: `<input type="file" accept="image/*" capture="environment">`.
  * Thuộc tính này sẽ khóa quyền truy cập vào Thư viện ảnh (Photo Gallery), ép trình duyệt di động phải mở Camera trực tiếp để chụp tờ giấy làm bài ngay lúc đó. Học sinh không thể chọn ảnh có sẵn đã tải từ Internet về.

### Tình huống 4: Giáo viên bị quá tải do AI báo lỗi giả quá nhiều (False Alarm Overload)
* **Kịch bản chí mạng:** Hệ thống thiết lập AI quá nhạy cảm. 80% bài làm của học sinh bị AI gắn nhãn "Hành văn phức tạp / Cần giáo viên chấm lại". Giáo viên mở Dashboard ra thấy danh sách chờ duyệt dài dặc, cuối cùng họ vẫn phải chấm tay gần như cả lớp $\rightarrow$ Nền tảng chấm điểm AI trở nên vô dụng.
* **Giải pháp của EduGrade AI:** **Vòng lặp học tập tích cực (Active Learning Loop)**.
  * Hệ thống lưu lại lịch sử chỉnh sửa điểm của giáo viên (`GradeRevision`).
  * Ví dụ: AI chấm câu này 1 điểm vì nghi ngờ cách viết của học sinh, nhưng giáo viên liên tục override thành 2 điểm và ghi chú *"Đúng ngữ pháp"*. Hệ thống sẽ gom các mẫu dữ liệu này và tự động tinh chỉnh (fine-tune) lại Prompt hướng dẫn chấm điểm của đề thi đó trong các bài kiểm tra sau, giúp AI ngày càng hiểu phong cách chấm của giáo viên đó, giảm tỷ lệ báo cờ giả xuống dưới **10%**.

### Tình huống 5: Học sinh chuyển tab để tra cứu đáp án (Tab Switching Cheat)
* **Kịch bản chí mạng:** Giáo viên bật chế độ chống gian lận (`antiCheatingEnabled: true`). Học sinh mở đề thi trực tuyến, sau đó liên tục mở tab khác trên Chrome hoặc chuyển sang ứng dụng khác để tra cứu Google.
* **Giải pháp của EduGrade AI:** **Enforce Fullscreen & Tab-State Tracking**.
  * Khi làm bài kiểm tra chống gian lận, trình duyệt bắt buộc chuyển sang chế độ Toàn màn hình (Fullscreen).
  * Sử dụng API `visibilitychange` và `blur` của Javascript để ghi nhận mỗi lần học sinh thoát khỏi màn hình kiểm tra. Hệ thống sẽ hiển thị cảnh báo đỏ ngay trên màn hình: *"Cảnh báo: Bạn đã rời khỏi màn hình thi. Vi phạm quá 3 lần bài làm sẽ tự động bị nộp."* Đồng thời ghi nhận log này vào `antiCheatLog` để giáo viên xem lại.
