import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const aiService = {
  async gradeAnswer(
    question: string,
    studentAnswer: string,
    rubrics: any[],
    instruction: string
  ): Promise<{ score: number, reason: string, confidence: 'HIGH' | 'MEDIUM' | 'LOW' }> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const prompt = `
        Bạn là một giám khảo nghiêm khắc chấm thi tự luận.
        Chỉ thị đặc biệt: ${instruction}
        Câu hỏi: ${question}
        Rubric chấm điểm: ${JSON.stringify(rubrics)}
        Bài làm của học sinh: ${studentAnswer}
        
        Nhiệm vụ: Dựa vào Rubric, hãy chấm điểm và nhận xét chi tiết.
        BẮT BUỘC trả về kết quả dưới định dạng JSON duy nhất, không kèm theo bất kỳ văn bản nào khác.
        {
          "score": [điểm số định dạng số],
          "reason": "[lời nhận xét chi tiết để học sinh hiểu vì sao mất điểm/được điểm]",
          "confidence": "HIGH" | "MEDIUM" | "LOW"
        }
      `;

      if (!process.env.GEMINI_API_KEY) {
        return { score: 1, reason: 'MOCKED: Vui lòng cấu hình GEMINI_API_KEY', confidence: 'HIGH' };
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Robust JSON Parsing (bóc tách JSON từ markdown block)
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return {
        score: parsed.score || 0,
        reason: parsed.reason || '',
        confidence: parsed.confidence || 'LOW'
      };
    } catch (error) {
      console.error('AI Grading failed:', error);
      return { score: 0, reason: 'Quá trình gọi AI bị lỗi.', confidence: 'LOW' };
    }
  }
};
