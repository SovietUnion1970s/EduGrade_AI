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
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Không tìm thấy file.' } }, { status: 400 });
    }

    // Convert file to Base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Thiếu cấu hình GEMINI_API_KEY' } }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Bạn là một trợ lý giáo dục chuyên nghiệp.
Nhiệm vụ của bạn là đọc hình ảnh/tài liệu này, tìm tất cả các câu hỏi (trắc nghiệm, tự luận) và chuyển chúng thành định dạng JSON để hệ thống tự động tạo bài thi.
Nếu tài liệu quá mờ hoặc có quá nhiều lỗi chính tả khiến bạn không thể nhận dạng câu hỏi một cách đáng tin cậy, hãy trả về một mảng rỗng [] và mô tả lỗi trong mảng issues.

TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON DUY NHẤT (không bọc trong markdown \`\`\`json):
{
  "issues": "Cảnh báo nếu ảnh/tài liệu bị mờ, không rõ ràng, sai chính tả nặng. Nếu tốt hãy để chuỗi rỗng.",
  "questions": [
    {
      "content": "Nội dung câu hỏi đầy đủ...",
      "maxScore": 10,
      "sampleAnswer": "Câu trả lời gợi ý hoặc đáp án (nếu có)",
      "rubricItems": [
        { "description": "Tiêu chí 1", "score": 5, "keywords": ["từ khóa 1"] },
        { "description": "Tiêu chí 2", "score": 5, "keywords": ["từ khóa 2"] }
      ]
    }
  ]
}
Hãy tạo rubric hợp lý cho mỗi câu hỏi nếu trong file không có sẵn rubric.
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

    if (parsed.issues && parsed.questions.length === 0) {
       return NextResponse.json({ 
        error: { 
          code: 'OCR_QUALITY_ERROR', 
          message: 'Tài liệu không đủ chất lượng để trích xuất câu hỏi.',
          details: { issues: parsed.issues }
        } 
      }, { status: 400 });
    }

    // Insert questions into database
    let orderIndex = await prisma.question.count({ where: { assignmentId: params.assignmentId } });
    
    for (const q of parsed.questions) {
      await prisma.question.create({
        data: {
          assignmentId: params.assignmentId,
          type: 'SHORT_ESSAY',
          content: q.content,
          maxScore: q.maxScore || 10,
          sampleAnswer: q.sampleAnswer || '',
          orderIndex: orderIndex++,
          rubricItems: {
            create: (q.rubricItems || []).map((r: any, idx: number) => ({
              description: r.description,
              score: r.score,
              keywords: r.keywords || [],
              orderIndex: idx
            }))
          }
        }
      });
    }

    return NextResponse.json({
      data: {
        success: true,
        count: parsed.questions.length,
        warning: parsed.issues || null
      }
    });
  } catch (error) {
    console.error('Generate Questions Error:', error);
    return NextResponse.json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Quá trình trích xuất bị lỗi.' }
    }, { status: 500 });
  }
}
