import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { storageService } from '@/lib/storage/storage.service';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để nộp bài.' } }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const questionContent = formData.get('questionContent') as string | null;
    const subject = formData.get('subject') as string | null;
    const assignmentTitle = formData.get('assignmentTitle') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Không tìm thấy file ảnh đính kèm.' } }, { status: 400 });
    }

    // 1. Chuyển đổi File thành Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'image/jpeg';

    // 2. Xử lý Upload File Thật (Local Storage hoặc Cloudflare R2)
    const uploadResult = await storageService.uploadFile(buffer, file.name, mimeType);
    const fileUrl = uploadResult.fileUrl;
    const uploadId = uploadResult.key;

    // 3. Sử dụng AI (Gemini) để trích xuất OCR và Đánh giá chất lượng ảnh
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Thiếu cấu hình GEMINI_API_KEY' } }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      }
    });

    const prompt = `
Bạn là chuyên gia thẩm định và giải mã chữ viết tay tiếng Việt (Handwriting OCR) hàng đầu.
Nhiệm vụ của bạn là đọc và chuyển đổi chính xác toàn bộ chữ viết tay của học sinh trong bức ảnh thành văn bản tiếng Việt chuẩn mực.

THÔNG TIN NGỮ CẢNH BÀI THI (ĐẶC BIỆT QUAN TRỌNG ĐỂ SUY LUẬN TỪ NGỮ CHÍNH XÁC):
- Môn học: ${subject || 'Không xác định'}
- Tên đề thi: ${assignmentTitle || 'Bài thi tự luận'}
- Câu hỏi đề bài yêu cầu: "${questionContent || 'Không có'}"

QUY TẮC BẮT BUỘC ĐỂ GIẢI MÃ CHỮ VIẾT TAY HỌC SINH (KỂ CẢ CHỮ XẤU, NGOÁY, MỜ):
1. SUY LUẬN THEO NGỮ CẢNH NGỮ NGHĨA (Context-aware Word Deduction):
   - Học sinh thường viết nhanh, chữ xấu, nét chữ bị dính hoặc thiếu nét.
   - TUYỆT ĐỐI KHÔNG bỏ cuộc hoặc dịch thành các chuỗi ký tự vô nghĩa (như 'asdf', '??',...).
   - Hãy kết hợp từ ngữ trước/sau trong câu với NGỮ CẢNH CÂU HỎI ĐỀ BÀI (ví dụ: các sự kiện lịch sử, tên nhân vật, địa danh, thuật ngữ khoa học liên quan đến đề bài) để suy luận ra từ ngữ có nghĩa và hợp lý nhất mà học sinh đang viết.
2. TỰ ĐỘNG KHÔI PHỤC DẤU VÀ CHÍNH TẢ TIẾNG VIỆT:
   - Tự động bổ sung đầy đủ và chính xác các dấu thanh (sắc, huyền, hỏi, ngã, nặng) và dấu mũ (â, ê, ô, ă, ơ, ư, đ) theo đúng ngữ pháp tiếng Việt.
3. GIẢI MÃ CÁC TỪ VIẾT TẮT PHỔ BIẾN CỦA HỌC SINH:
   - "ko", "k" -> "không"
   - "đc" -> "được"
   - "pt" -> "phát triển" hoặc "phương trình" (tùy môn học)
   - "kt", "xh" -> "kinh tế", "xã hội"
   - "ch" -> "cộng hòa"
   - "lx" -> "Liên Xô"
4. GIỮ NGUYÊN CẤU TRÚC VĂN BẢN:
   - Giữ nguyên các dòng, gạch đầu dòng (-), số thứ tự (1, 2, 3) hoặc các đoạn mà học sinh trình bày.
5. CÔNG THỨC TOÁN HỌC, VẬT LÝ, HÓA HỌC (CHUẨN LATEX):
   - Nếu trong bài làm có công thức, số mũ, căn thức, phân số, tích phân, ma trận hoặc phương trình hóa học, BẮT BUỘC trích xuất thành mã LaTeX chuẩn bọc giữa cặp dấu $...$ (trong dòng) hoặc $$...$$ (khối riêng). Ví dụ: $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$, $\\int_0^1 x dx$.

TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON DUY NHẤT (không bọc trong bất kỳ văn bản nào khác):
{
  "extractedText": "Nội dung văn bản tiếng Việt đã được trích xuất và suy luận chính xác, hoàn chỉnh...",
  "confidence": 0.95,
  "issues": "Nhận xét ngắn gọn về chất lượng ảnh hoặc chữ viết nếu có cảnh báo, để trống chuỗi nếu đọc tốt."
}
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: mimeType
        }
      }
    ]);

    const text = result.response.text();
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    // Nếu điểm tự tin quá thấp hoặc cảnh báo quá nghiêm trọng, có thể trả về lỗi OCR_CONFIDENCE_TOO_LOW
    if (parsed.confidence < 0.3) {
      return NextResponse.json({ 
        error: { 
          code: 'OCR_CONFIDENCE_TOO_LOW', 
          message: 'Hệ thống AI không thể nhận diện được chữ trong ảnh. Vui lòng chụp lại rõ nét hơn.',
          details: { issues: parsed.issues }
        } 
      }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        uploadId,
        fileUrl,
        ocrText: parsed.extractedText || '',
        ocrConfidence: parsed.confidence || 0.9,
        warning: parsed.issues || null
      }
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Quá trình xử lý ảnh bị lỗi.' }
    }, { status: 500 });
  }
}
