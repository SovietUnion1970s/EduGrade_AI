import { Worker } from 'bullmq';
import { getRedisClient } from '@/lib/redis';
import { prisma } from '@/lib/db';
import { aiService } from '../services/ai.service';
import { GRADING_QUEUE_NAME } from './queue';
import { Prisma } from '@prisma/client';

export const gradingWorker = new Worker(GRADING_QUEUE_NAME, async (job) => {
  const { submissionId } = job.data;
  console.log(`[Worker] Bắt đầu xử lý chấm bài: ${submissionId}`);
  
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: { include: { questions: true } },
      answers: { include: { question: { include: { rubricItems: true } } } }
    }
  });

  if (!submission) throw new Error('Không tìm thấy bài nộp');

  // Tính tổng maxScore của đề
  const maxScore = submission.assignment.questions.reduce((acc, q) => acc + Number(q.maxScore), 0);

  // Tạo khung điểm Grade
  const grade = await prisma.grade.create({
    data: {
      submissionId,
      maxScore: new Prisma.Decimal(maxScore),
      status: 'AI_DRAFT'
    }
  });

  let aiTotalScore = 0;
  
  // Chấm từng câu hỏi
  for (const answer of submission.answers) {
    if (answer.answerText) {
      const instruction = submission.assignment.aiGradingInstruction || 'Hãy chấm công bằng.';
      const aiResult = await aiService.gradeAnswer(
        answer.question.content,
        answer.answerText,
        answer.question.rubricItems,
        instruction
      );
      
      aiTotalScore += aiResult.score;
      
      await prisma.gradeBreakdown.create({
        data: {
          gradeId: grade.id,
          questionId: answer.questionId,
          scoreAwarded: new Prisma.Decimal(aiResult.score),
          aiScoreSuggested: new Prisma.Decimal(aiResult.score),
          aiReasoning: aiResult.reason,
          confidenceLevel: aiResult.confidence
        }
      });
    }
  }
  
  // Cập nhật điểm tổng quát
  await prisma.grade.update({
    where: { id: grade.id },
    data: { 
      aiTotalScore: new Prisma.Decimal(aiTotalScore), 
      totalScore: new Prisma.Decimal(aiTotalScore) 
    }
  });

  // Chuyển trạng thái Submission thành GRADED
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: 'GRADED' }
  });
  
  // Phát tín hiệu Real-time SSE cho Frontend qua Redis Pub/Sub
  await getRedisClient().publish(`submission_status:${submissionId}`, JSON.stringify({ 
    event: 'grading_complete',
    submissionId, 
    status: 'GRADED',
    totalScore: aiTotalScore
  }));
  
  console.log(`[Worker] Hoàn tất chấm bài: ${submissionId} | Tổng điểm: ${aiTotalScore}`);
}, {
  connection: getRedisClient() as any,
  concurrency: 5 // Kiểm soát giới hạn API (Rate Limit) theo ARCHITECTURAL_ADDENDUM
});
