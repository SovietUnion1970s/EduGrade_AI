import { NextRequest } from 'next/server';
import { getRedisSubscriber } from '@/lib/redis';

// Vô hiệu hóa Next.js Caching cho luồng SSE
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { submissionId: string } }) {
  const submissionId = params.submissionId;

  const stream = new ReadableStream({
    async start(controller) {
      // Phải duplicate client để subscriber không block các tác vụ Redis khác
      const subscriber = getRedisSubscriber().duplicate();
      const channel = `submission_status:${submissionId}`;

      await subscriber.subscribe(channel);

      // Tín hiệu kết nối khởi tạo
      controller.enqueue(`data: ${JSON.stringify({ event: 'connected', submissionId })}\n\n`);

      subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          // Bắn dữ liệu về Browser của học sinh
          controller.enqueue(`data: ${message}\n\n`);
          
          // Nếu trạng thái hoàn thành, tự động đóng kết nối tránh tốn bộ nhớ
          const data = JSON.parse(message);
          if (data.event === 'grading_complete' || data.event === 'grading_failed') {
            subscriber.unsubscribe(channel);
            subscriber.quit();
            controller.close();
          }
        }
      });

      // Cleanup khi user tắt trình duyệt hoặc mất mạng
      req.signal.addEventListener('abort', () => {
        subscriber.unsubscribe(channel);
        subscriber.quit();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
