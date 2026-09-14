import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request, { params }: { params: { assignmentId: string } }) {
  try {
    const session = await auth();
    if (!session || !session.user || (session.user as any).role !== 'TEACHER') {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Không có quyền truy cập.' } }, { status: 401 });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: params.assignmentId },
      include: { class: true }
    });

    if (!assignment || assignment.class.teacherId !== session.user.id) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Bạn không sở hữu bài tập này.' } }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Không tìm thấy file đề mẫu.' } }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'application/pdf';

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Thiếu cấu hình GEMINI_API_KEY' } }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Bạn là một chuyên gia khảo thí và thiết kế ma trận đề thi giáo dục hàng đầu.
Nhiệm vụ của bạn: Hãy đọc file đề thi mẫu này (hình ảnh hoặc PDF), phân tích cấu trúc, phong cách ra đề của trường/nền giáo dục này và trích xuất thành một BẢN MÔ TẢ MA TRẬN CẤU TRÚC ĐỀ THI (Exam Blueprint Markdown).

Bản mô tả này sẽ được dùng làm "System Instruction / Hướng dẫn mẫu" để AI tạo ra các đề thi tương lai bám sát 100% cấu trúc của ngôi trường hoặc kỳ thi này.

YÊU CẦU NỘI DUNG BLUEPRINT TRẢ VỀ:
1. Thông tin chung: Tên kỳ thi / Đối tượng (nếu nhận diện được), môn học, thang điểm tổng, quy tắc làm tròn điểm.
2. Cấu trúc từng phần (Phần I, Phần II, Phần III,...):
   - Thể loại câu hỏi (Trắc nghiệm 4 lựa chọn, Trắc nghiệm Đúng/Sai chùm 4 ý a-b-c-d, Trả lời ngắn, hay Tự luận tính toán bước).
   - Số lượng câu hỏi và điểm số phân bổ cho mỗi câu / mỗi ý.
3. Quy chuẩn biểu diễn khoa học:
   - Tất cả công thức Toán, Lý, Hóa bắt buộc dùng LaTeX bọc trong $...$ hoặc $$...$$.
   - Bảng biến thiên hàm số, bảng số liệu bắt buộc dùng môi trường LaTeX \\begin{array}{...} ... \\end{array} bên trong $$...$$.
4. Tiêu chí chấm điểm và bareme gợi ý.

TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON (không bọc trong \`\`\`json):
{
  "summary": "Tóm tắt ngắn gọn cấu trúc (VD: Đề thi THPT Quốc Gia môn Toán 2025 gồm 3 phần, tổng 10 điểm, 22 câu)",
  "blueprint": "Nội dung Markdown đầy đủ của bản cấu trúc đề thi..."
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
    let parsed;
    
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Lỗi parse JSON Blueprint từ AI:", text);
      return NextResponse.json({ 
        data: {
          summary: "Cấu trúc đề thi trích xuất từ đề mẫu",
          blueprint: cleaned
        }
      });
    }

    return NextResponse.json({
      data: {
        success: true,
        summary: parsed.summary || 'Trích xuất cấu trúc đề thi thành công',
        blueprint: parsed.blueprint || cleaned
      }
    });

  } catch (error: any) {
    console.error('Extract Blueprint Error:', error);
    return NextResponse.json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Quá trình phân tích đề mẫu bị lỗi.' }
    }, { status: 500 });
  }
}
