import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAICacheManager } from '@google/generative-ai/server';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
const cacheManager = new GoogleAICacheManager(apiKey);

// Local registry for Google Cache
const cacheRegistry = new Map<string, { cache: any, expiresAt: number }>();

export const aiService = {
  async gradeAnswer(
    questionId: string,
    question: string,
    studentAnswer: string,
    rubrics: any[],
    instruction: string
  ): Promise<{ score: number, reason: string, confidence: 'HIGH' | 'MEDIUM' | 'LOW' }> {
    try {
      // 1. Smart Model Routing: Auto-zero for empty submissions
      if (!studentAnswer || studentAnswer.trim().length === 0) {
        return { score: 0, reason: 'Hệ thống tự động chấm 0 điểm do học sinh để trống bài làm.', confidence: 'HIGH' };
      }

      // 2. Smart Model Routing: Select model based on answer length
      const isShortText = studentAnswer.trim().length < 200;
      const baseModel = isShortText ? 'gemini-1.5-flash-001' : 'gemini-1.5-pro-001';

      if (!apiKey) {
        return { score: 1, reason: 'MOCKED: Vui lòng cấu hình GEMINI_API_KEY', confidence: 'HIGH' };
      }

      // Prepare Context Caching for Question & Rubrics
      const cacheKey = questionId;
      let cachedContent: any = null;
      
      const existingCache = cacheRegistry.get(cacheKey);
      if (existingCache && existingCache.expiresAt > Date.now()) {
        cachedContent = existingCache.cache;
        console.log(`[AI Service] Cache Hit for question ${questionId}: ${cachedContent.name}`);
      } else {
        try {
          const systemInstruction = `
Bạn là một giám khảo nghiêm khắc chấm thi tự luận.
Chỉ thị đặc biệt: ${instruction}
Câu hỏi: ${question}
Rubric chấm điểm: ${JSON.stringify(rubrics)}

Nhiệm vụ: Dựa vào Rubric, hãy chấm điểm và nhận xét chi tiết.
BẮT BUỘC trả về kết quả dưới định dạng JSON duy nhất, không kèm theo bất kỳ văn bản nào khác.
{
  "score": [điểm số định dạng số],
  "reason": "[lời nhận xét chi tiết để học sinh hiểu vì sao mất điểm/được điểm]",
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}
          `;
          
          const cacheResult = await cacheManager.create({
            model: `models/${baseModel}`,
            contents: [{
              role: 'user',
              parts: [{ text: "Ghi nhớ tiêu chí chấm điểm này cho các bài làm tiếp theo." }]
            }],
            systemInstruction,
            ttlSeconds: 1800, // 30 minutes
          });
          
          cachedContent = cacheResult;
          cacheRegistry.set(cacheKey, {
            cache: cachedContent,
            expiresAt: Date.now() + (1800 * 1000) - 60000 // expire local cache 1 min before Google's TTL
          });
          console.log(`[AI Service] Created Context Cache for question ${questionId}: ${cachedContent.name}`);
        } catch (cacheError: any) {
          console.log(`[AI Service] Context Caching fallback cho câu hỏi ${questionId} (Có thể do dưới 32k tokens): ${cacheError.message}`);
        }
      }

      let model;
      let prompt;

      if (cachedContent) {
         // Sử dụng Context Caching 
         model = genAI.getGenerativeModelFromCachedContent(cachedContent);
         prompt = `Bài làm của học sinh:\n${studentAnswer}`;
      } else {
         // Chế độ không dùng Context Caching (do fallback)
         model = genAI.getGenerativeModel({ model: baseModel });
         prompt = `
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
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
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
