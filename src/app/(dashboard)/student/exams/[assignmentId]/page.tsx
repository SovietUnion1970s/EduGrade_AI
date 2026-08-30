"use client";

import { trpc } from "@/lib/trpc";
import { ArrowLeft, Clock, Send, Camera, CheckCircle2, ShieldAlert, Loader2, Maximize2, AlertTriangle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

export default function ExamRoomPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;
  const router = useRouter();

  const { data: assignment, isLoading } = trpc.assignment.getById.useQuery({ id: assignmentId });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [ocrLoadingQuestionId, setOcrLoadingQuestionId] = useState<string | null>(null);
  const [ocrSuccessQuestionId, setOcrSuccessQuestionId] = useState<string | null>(null);

  // Anti-cheat state
  const [antiCheatLogs, setAntiCheatLogs] = useState<Array<{ event: string; timestamp: string; count: number }>>([]);
  const [violationCount, setViolationCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dialog modal state
  const [dialog, setDialog] = useState<{
    isOpen: boolean; title: string; message: string;
    type: 'info' | 'error' | 'confirm'; onConfirm?: () => void;
  }>({ isOpen: false, title: "", message: "", type: 'info' });

  // Refs to avoid stale closures inside event listeners
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const antiCheatLogsRef = useRef(antiCheatLogs);
  useEffect(() => { antiCheatLogsRef.current = antiCheatLogs; }, [antiCheatLogs]);

  const violationCountRef = useRef(violationCount);
  useEffect(() => { violationCountRef.current = violationCount; }, [violationCount]);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const hasStartedRef = useRef(false);

  const logViolationMutation = trpc.submission.logViolation.useMutation();
  const startExamMutation = trpc.submission.startExam.useMutation();

  // submitMutation được khai báo TRƯỚC useEffect để tránh closure stale
  const submitMutation = trpc.submission.submit.useMutation({
    onSuccess: (data) => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setDialog({
        isOpen: true,
        title: "Nộp bài thành công ✅",
        message: "Đã nộp bài thành công! EduGrade AI đang chấm điểm...",
        type: 'info',
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          router.push(`/student/submissions/${data.submissionId}`);
        }
      });
    },
    onError: (err) => setDialog({
      isOpen: true, title: "Lỗi", message: err.message, type: 'error',
      onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
    })
  });

  // Ref để gọi submitMutation bên trong event listener mà không bị stale closure
  const submitMutationRef = useRef(submitMutation);
  useEffect(() => { submitMutationRef.current = submitMutation; }, [submitMutation]);

  const assignmentRef = useRef(assignment);
  useEffect(() => { assignmentRef.current = assignment; }, [assignment]);

  // Khởi tạo bài thi (chỉ 1 lần)
  useEffect(() => {
    if (assignmentId && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startExamMutation.mutate({ assignmentId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  // Anti-Cheat logic — sử dụng refs để tránh stale closures
  const forceSubmit = useCallback((logs: Array<{ event: string; timestamp: string; count: number }>) => {
    const currentAssignment = assignmentRef.current;
    if (!currentAssignment) return;
    submitMutationRef.current.mutate({
      assignmentId,
      answers: currentAssignment.questions.map(q => ({
        questionId: q.id,
        answerText: answersRef.current[q.id] || ""
      })),
      antiCheatLog: logs
    });
  }, [assignmentId]);

  useEffect(() => {
    if (!assignment?.antiCheatingEnabled) return;

    const logViolation = (eventType: string, reason: string) => {
      const now = new Date().toISOString();
      const nextCount = violationCountRef.current + 1;
      violationCountRef.current = nextCount;

      const newLog = { event: eventType, timestamp: now, count: nextCount };
      const updatedLogs = [...antiCheatLogsRef.current, newLog];

      setViolationCount(nextCount);
      setAntiCheatLogs(updatedLogs);
      antiCheatLogsRef.current = updatedLogs;

      toast.warning(`⚠️ Vi phạm lần ${nextCount}: ${reason}`, { duration: 5000 });

      logViolationMutation.mutate({ assignmentId, event: eventType, reason });

      if (nextCount >= 5) {
        toast.error("Hệ thống đã tự động thu bài do vi phạm quá nhiều!", { duration: 10000 });
        forceSubmit(updatedLogs);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation("TAB_SWITCH", "Chuyển Tab hoặc ẩn trình duyệt");
      }
    };

    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        logViolation("FULLSCREEN_EXIT", "Thoát Toàn Màn Hình");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [assignment?.antiCheatingEnabled, assignmentId, forceSubmit]);

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const handleImageUpload = async (questionId: string, file?: File) => {
    if (!file) return;
    setOcrLoadingQuestionId(questionId);
    setOcrSuccessQuestionId(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/uploads/image", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || "Lỗi khi xử lý ảnh.");
      const extractedText = result.data.ocrText || "";
      setAnswers(prev => ({
        ...prev,
        [questionId]: prev[questionId]
          ? `${prev[questionId]}\n\n[Nội dung bóc chữ OCR từ ảnh]:\n${extractedText}`
          : extractedText,
      }));
      setOcrSuccessQuestionId(questionId);
    } catch (err: any) {
      toast.error("Lỗi OCR ảnh: " + err.message);
    } finally {
      setOcrLoadingQuestionId(null);
    }
  };

  const handleSubmit = () => {
    if (assignment?.antiCheatingEnabled && !isFullscreen) {
      setDialog({
        isOpen: true, title: "Yêu cầu Fullscreen",
        message: "Bạn phải đang ở chế độ Toàn Màn Hình để nộp bài!",
        type: 'error', onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const hasAnswered = Object.values(answers).some(ans => ans.trim().length > 0);
    if (!hasAnswered) {
      setDialog({
        isOpen: true, title: "Chưa làm bài",
        message: "Bạn chưa điền câu trả lời nào. Vui lòng làm bài trước khi nộp!",
        type: 'error', onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setDialog({
      isOpen: true, title: "Xác nhận nộp bài",
      message: "Bạn có chắc chắn muốn nộp bài? Sau khi nộp sẽ không thể sửa thêm.",
      type: 'confirm',
      onConfirm: () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        submitMutation.mutate({
          assignmentId,
          answers: assignment!.questions.map(q => ({
            questionId: q.id,
            answerText: answers[q.id] || ""
          })),
          antiCheatLog: antiCheatLogs
        });
      }
    });
  };

  if (isLoading) return <div className="text-slate-400 text-center py-20">Đang tải cấu trúc đề thi...</div>;
  if (!assignment) return <div className="text-brand-danger text-center py-20">Không tìm thấy đề thi.</div>;

  // Nếu đã nộp rồi
  if (assignment.submissions && assignment.submissions.length > 0) {
    return (
      <div className="glass-panel p-12 rounded-3xl text-center max-w-2xl mx-auto mt-10 border border-emerald-500/30">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Bạn đã nộp bài này rồi</h2>
        <p className="text-slate-400 mb-8">Bài làm của bạn đang được hệ thống chấm điểm hoặc đã có kết quả.</p>
        <Link href={`/student/submissions/${assignment.submissions[0].id}`} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-premium">
          Xem chi tiết kết quả
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 relative">
      {/* Dialog / Modal */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700/50 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className={`text-xl font-bold mb-2 ${dialog.type === 'error' ? 'text-red-400' : 'text-white'}`}>
              {dialog.title}
            </h3>
            <p className="text-slate-300 mb-6">{dialog.message}</p>
            <div className="flex justify-end gap-3">
              {dialog.type === 'confirm' && (
                <button
                  onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors font-medium"
                >
                  Hủy bỏ
                </button>
              )}
              <button
                onClick={dialog.onConfirm || (() => setDialog(prev => ({ ...prev, isOpen: false })))}
                className={`px-6 py-2 rounded-xl text-white font-bold transition-colors ${
                  dialog.type === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-accent hover:bg-indigo-600'
                }`}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border-t-4 border-t-brand-accent sticky top-4 z-10 backdrop-blur-xl bg-[#0a0f1c]/80 shadow-premium">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white mb-1">{assignment.title}</h1>
            <p className="text-slate-400 text-sm">Lớp: {assignment.class.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {assignment.antiCheatingEnabled && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                violationCount > 0
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                <ShieldAlert className="w-4 h-4" />
                <span>Anti-Cheat: {violationCount > 0 ? `Vi phạm (${violationCount}/5)` : '🟢 Bật'}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-amber-400 font-mono font-bold bg-amber-400/10 px-4 py-2 rounded-xl border border-amber-400/20 text-sm">
              <Clock className="w-4 h-4" />
              {assignment.timeLimitMinutes ? `${assignment.timeLimitMinutes} Phút` : 'Tự do'}
            </div>
          </div>
        </div>
        {assignment.description && (
          <div className="mt-4 p-4 bg-white/5 rounded-xl text-slate-300 text-sm border border-white/5 leading-relaxed">
            <strong className="text-white">Lời dặn của Giáo viên:</strong> {assignment.description}
          </div>
        )}
      </div>

      {/* Gateway: Bắt buộc Fullscreen nếu anti-cheat bật */}
      {assignment.antiCheatingEnabled && !isFullscreen ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-amber-500/30 max-w-xl mx-auto mt-10">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-3">Yêu cầu Bật Toàn Màn Hình</h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Bài thi này bật tính năng chống gian lận. Bạn <strong>BẮT BUỘC</strong> làm bài ở chế độ toàn màn hình.
            Nếu bạn thoát hoặc chuyển tab, hệ thống sẽ cảnh báo và tự động thu bài sau 5 lần vi phạm.
          </p>
          <button
            onClick={requestFullscreen}
            className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 rounded-xl font-extrabold transition-all shadow-premium text-lg"
          >
            <Maximize2 className="w-5 h-5" /> Bật Fullscreen & Vào thi
          </button>
        </div>
      ) : (
        <>
          {/* Danh sách câu hỏi */}
          <div className="space-y-8">
            {assignment.questions.map((q, index) => (
              <div key={q.id} className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 relative shadow-lg">
                <div className="absolute top-0 right-0 bg-brand-accent/20 px-5 py-2 rounded-bl-2xl rounded-tr-3xl text-sm font-bold text-brand-accent border-b border-l border-brand-accent/20">
                  {Number(q.maxScore)} điểm
                </div>

                <h3 className="font-bold text-lg mb-4 text-white">Câu {index + 1}</h3>
                <div className="text-slate-200 whitespace-pre-wrap leading-relaxed mb-6 font-medium text-lg">
                  {q.content}
                </div>

                <div className="space-y-3 bg-black/20 p-5 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-brand-accent font-bold uppercase tracking-wider">
                      Bài làm của bạn:
                    </label>
                    {ocrSuccessQuestionId === q.id && (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        <Sparkles className="w-3.5 h-3.5" /> AI OCR Đã bóc chữ
                      </span>
                    )}
                  </div>
                  <textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full bg-transparent border-0 ring-0 outline-none resize-y text-white font-mono text-base leading-relaxed placeholder-slate-600 focus:ring-0 min-h-[150px]"
                    placeholder="Nhập câu trả lời tại đây..."
                  />
                  <div className="flex justify-end pt-3 border-t border-white/10">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[q.id] = el; }}
                      onChange={(e) => handleImageUpload(q.id, e.target.files?.[0])}
                    />
                    <button
                      onClick={() => fileInputRefs.current[q.id]?.click()}
                      disabled={ocrLoadingQuestionId === q.id}
                      className="flex items-center gap-2 px-4 py-2.5 bg-brand-accent/20 hover:bg-brand-accent text-brand-accent hover:text-white rounded-xl text-xs font-bold transition-all border border-brand-accent/30 disabled:opacity-50"
                    >
                      {ocrLoadingQuestionId === q.id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /><span>AI đang quét OCR...</span></>
                      ) : (
                        <><Camera className="w-4 h-4" /> Chụp / Tải ảnh viết tay (AI OCR)</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Nút nộp bài */}
          <div className="flex justify-end sticky bottom-6 z-10">
            <button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="flex items-center gap-3 bg-brand-accent hover:bg-indigo-600 text-white px-10 py-4 rounded-2xl font-extrabold shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all disabled:opacity-50 text-lg hover:-translate-y-1"
            >
              <Send className="w-6 h-6" />
              {submitMutation.isPending ? "Đang gửi dữ liệu..." : "Nộp bài ngay"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
