export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PHASE !== 'phase-production-build') {
    console.log('[Instrumentation] Khởi chạy background worker cho chấm bài...');
    await import('../server/worker/gradingWorker');
  }
}
