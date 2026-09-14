import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { QuestionType } from '@prisma/client';

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
    const mode = (formData.get('mode') as string) || 'replace';
    
    if (!file) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Không tìm thấy file đề thi.' } }, { status: 400 });
    }

    // Convert file to Base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'application/pdf';

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Thiếu cấu hình GEMINI_API_KEY' } }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Khung cấu trúc đề thi tùy chỉnh (nếu giáo viên đã cài đặt)
    const customBlueprint = assignment.aiGradingInstruction?.trim() 
      ? `\n### KHUNG MA TRẬN & QUY TẮC CẤU TRÚC ĐỀ THI DO GIÁO VIÊN/TRƯỜNG QUY ĐỊNH:\n${assignment.aiGradingInstruction}\nBẠN BẮT BUỘC PHẢI BÁM SÁT 100% CẤU TRÚC TRÊN ĐỂ BÓC TÁCH CÂU HỎI VÀ TÍNH ĐIỂM.\n`
      : `\n### TIÊU CHUẨN MẶC ĐỊNH: ${assignment.gradingStyle}\nNếu nhận thấy đề thi thuộc chuẩn THPT Quốc Gia (đặc biệt từ năm 2025), hãy tuân thủ cấu trúc 3 phần chuẩn của Bộ GD&ĐT.\n`;

    const prompt = `
Bạn là một chuyên gia khảo thí và bóc tách đề thi sư phạm cấp cao.
Nhiệm vụ của bạn là đọc hình ảnh/tài liệu đề thi được cung cấp và chuyển đổi tất cả các câu hỏi thành cấu trúc JSON tiêu chuẩn.

${customBlueprint}

### QUY TẮC BẮT BUỘC VỀ ĐỊNH DẠNG TOÁN, LÝ, HÓA (KATEX / LATEX):
1. **100% CÔNG THỨC TOÁN, VẬT LÝ, HÓA HỌC BẮT BUỘC PHẢI DÙNG LATEX**:
   - Công thức trong dòng (inline) kẹp trong cặp dấu: \`$công_thức$\` (Ví dụ: \`$y = \\frac{ax+b}{cx+d}$\`, \`$t \\in [0; 12]$\`, \`$\\int_a^b f(t)dt$\`, \`$\\vec{v}$\`, \`$H_2SO_4$\`).
   - Khối công thức độc lập (block) kẹp trong cặp dấu: \`$$công_thức$$\`.
   - TUYỆT ĐỐI KHÔNG xuất văn bản ASCII thô như "y = (ax+b)/(cx+d)", "F(t) = -0.05t^3", "c != 0". Phải chuyển thành: \`$y = \\frac{ax+b}{cx+d}$\`, \`$F(t) = -0.05t^3 + 0.9t^2$\`, \`$c \\neq 0$\`.

2. **XỬ LÝ BẢNG BIẾN THIÊN & BẢNG SỐ LIỆU (VARIATION TABLES)**:
   - TUYỆT ĐỐI KHÔNG tóm tắt vụng về bằng văn bản mô tả như: "[Bảng biến thiên: x từ -∞ đến 1...]".
   - Bắt buộc dựng lại Bảng biến thiên bằng môi trường LaTeX \\begin{array} đặt trong $$...$$ để KaTeX hiển thị hoàn hảo như SGK.
   - Ví dụ mẫu Bảng biến thiên KaTeX:
$$
\\begin{array}{c|ccccc}
x & -\\infty & & 1 & & +\\infty \\\\
\\hline
y' & & + & || & + & \\\\
\\hline
& & & +\\infty & & \\\\
y & & \\nearrow & || & \\nearrow & \\\\
& -2 & & || & & -2
\\end{array}
$$

3. **QUY TẮC XỬ LÝ CÂU HỎI NHIỀU Ý / CÂU HỎI CHÙM (ĐẶC BIỆT ĐỀ THPT QG 2025)**:
   - **Phần II (Trắc nghiệm Đúng/Sai 4 ý a, b, c, d)**:
     + TUYỆT ĐỐI KHÔNG chia nhỏ Câu 1a, Câu 1b, Câu 1c thành các câu hỏi riêng biệt!
     + Phải giữ nguyên vẹn ngữ cảnh bài toán và gom 4 ý a, b, c, d vào cùng một câu hỏi.
     + Định dạng \`content\`:
       "Nội dung đề bài bài toán chung...\\n\\n* a) Mệnh đề 1...\\n* b) Mệnh đề 2...\\n* c) Mệnh đề 3...\\n* d) Mệnh đề 4..."
     + Trong \`rubricItems\`: tạo 4 tiêu chí chấm điểm tương ứng với ý a, b, c, d (ghi rõ điểm và đáp án Đúng/Sai cho từng ý).
   - **Phần I (Trắc nghiệm 4 lựa chọn)**:
     + Đưa nội dung 4 phương án A, B, C, D rõ ràng vào trường \`choices\`.

TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON DUY NHẤT (không bọc trong markdown \`\`\`json):
{
  "issues": "Cảnh báo nếu ảnh/tài liệu bị mờ hoặc không rõ nét. Nếu tài liệu tốt hãy để rỗng chuỗi rỗng.",
  "questions": [
    {
      "type": "SHORT_ESSAY" | "MULTIPLE_CHOICE" | "FILL_BLANK",
      "content": "Nội dung câu hỏi đầy đủ (kèm công thức LaTeX $...$ và bảng biến thiên $$...$$ nếu có)...",
      "maxScore": 2.0,
      "choices": [
        { "id": "A", "text": "Phương án A" },
        { "id": "B", "text": "Phương án B" },
        { "id": "C", "text": "Phương án C" },
        { "id": "D", "text": "Phương án D" }
      ],
      "correctAnswer": "A",
      "sampleAnswer": "Lời giải gợi ý hoặc đáp án phân tích chi tiết (có LaTeX)...",
      "rubricItems": [
        { "description": "Ý a: Đúng. Giải thích...", "score": 0.5, "keywords": ["đúng"] },
        { "description": "Ý b: Sai. Giải thích...", "score": 0.5, "keywords": ["sai"] }
      ]
    }
  ]
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
      console.error("Lỗi parse JSON từ AI:", text);
      return NextResponse.json({ error: { code: 'AI_PARSE_ERROR', message: 'AI trả về định dạng không hợp lệ. Vui lòng thử lại.' } }, { status: 500 });
    }

    if (parsed.issues && (!parsed.questions || parsed.questions.length === 0)) {
       return NextResponse.json({ 
        error: { 
          code: 'OCR_QUALITY_ERROR', 
          message: 'Tài liệu không đủ chất lượng để trích xuất câu hỏi.',
          details: { issues: parsed.issues }
        } 
      }, { status: 400 });
    }

    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
    if (rawQuestions.length === 0) {
      return NextResponse.json({
        error: { code: 'NO_QUESTIONS_FOUND', message: 'Không tìm thấy câu hỏi nào trong tài liệu này.' }
      }, { status: 400 });
    }

    // Xử lý chế độ Ghi đè (replace) hoặc Thêm tiếp (append)
    if (mode === 'replace') {
      await prisma.question.deleteMany({
        where: { assignmentId: params.assignmentId }
      });
    }

    // Insert questions into database
    let orderIndex = mode === 'replace' ? 0 : await prisma.question.count({ where: { assignmentId: params.assignmentId } });
    
    for (const q of rawQuestions) {
      let qType: QuestionType = QuestionType.SHORT_ESSAY;
      if (q.type && Object.values(QuestionType).includes(q.type as QuestionType)) {
        qType = q.type as QuestionType;
      } else if (Array.isArray(q.choices) && q.choices.length >= 2) {
        qType = QuestionType.MULTIPLE_CHOICE;
      }

      await prisma.question.create({
        data: {
          assignmentId: params.assignmentId,
          type: qType,
          content: q.content || '',
          maxScore: q.maxScore ? Number(q.maxScore) : 2.0,
          choices: Array.isArray(q.choices) && q.choices.length > 0 ? q.choices : undefined,
          correctAnswer: q.correctAnswer || undefined,
          sampleAnswer: q.sampleAnswer || '',
          orderIndex: orderIndex++,
          rubricItems: {
            create: (q.rubricItems || []).map((r: any, idx: number) => ({
              description: r.description || `Tiêu chí ${idx + 1}`,
              score: r.score ? Number(r.score) : 0.5,
              keywords: Array.isArray(r.keywords) ? r.keywords : [],
              orderIndex: idx
            }))
          }
        }
      });
    }

    return NextResponse.json({
      data: {
        success: true,
        count: rawQuestions.length,
        warning: parsed.issues || null
      }
    });
  } catch (error: any) {
    console.error('Generate Questions Error:', error);
    return NextResponse.json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Quá trình trích xuất câu hỏi bị lỗi.' }
    }, { status: 500 });
  }
}
