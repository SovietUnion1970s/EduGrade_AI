import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để nộp bài.' } }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Không tìm thấy file ảnh đính kèm.' } }, { status: 400 });
    }

    // 1. Xử lý Upload File (Giả lập URL lưu trữ Cloud)
    const fileUrl = `https://storage.edugrade.vn/uploads/${Date.now()}_${file.name}`;
    const uploadId = `upl_${Date.now()}`;

    // 2. Chặn lỗi chí mạng: Tính toán độ mờ (Blur) & pHash hình ảnh
    // - Nếu quá mờ (contrast quá thấp): Trả lỗi Validation ngay lập tức, bắt chụp lại.
    // - Lưu pHash vào DB để chống gian lận dùng chung ảnh.

    // 3. Gọi Google Cloud Vision API để OCR chữ viết tay
    // const client = new vision.ImageAnnotatorClient();
    // const [result] = await client.documentTextDetection(buffer);
    // const ocrText = result.fullTextAnnotation?.text || '';
    
    const sampleOcrAnswers = [
      "Bài làm viết tay: Tác giả đã sử dụng biện pháp nghệ thuật so sánh và ẩn dụ tinh tế nhằm làm nổi bật tình yêu quê hương đất nước sâu sắc qua từng trang văn.",
      "Giải bài tập tự luận: Qua phân tích các chi tiết trong tác phẩm, ta nhận thấy vẻ đẹp tâm hồn kiên cường và tấm lòng vị tha sâu sắc của nhân vật.",
      "Trả lời: Áp dụng phương pháp phân tích tác phẩm văn học, học sinh trình bày các luận điểm chính: 1. Hoàn cảnh sáng tác, 2. Bố cục và cảm xúc chủ đạo."
    ];
    const ocrText = sampleOcrAnswers[Math.floor(Math.random() * sampleOcrAnswers.length)];
    const ocrConfidence = 0.94; 

    return NextResponse.json({
      data: {
        uploadId,
        fileUrl,
        ocrText,
        ocrConfidence,
        warning: null
      }
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Quá trình xử lý ảnh bị lỗi.' }
    }, { status: 500 });
  }
}
