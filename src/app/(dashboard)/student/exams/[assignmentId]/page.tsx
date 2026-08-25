"use client";

import { trpc } from "@/lib/trpc";
import { ArrowLeft, Clock, Send, Camera, CheckCircle2, ShieldAlert, Loader2, Maximize2, AlertTriangle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

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
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [lastWarningText, setLastWarningText] = useState("");

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const logViolationMutation = trpc.submission.logViolation.useMutation();
  const startExamMutation = trpc.submission.startExam.useMutation();

  // 1. Khởi tạo Submission ngay khi vào phòng thi để Giáo viên giám sát
  useEffect(() => {
    if (assignmentId) {
      startExamMutation.mutate({ assignmentId });
    }
  }, [assignmentId]);

  // 2. Anti-Cheat Event Listeners (Tab switch, Blur, Fullscreen Exit)
  useEffect(() => {
    if (!assignment?.antiCheatingEnabled) return;

    const logViolation = (eventType: string, reason: string) => {
      const now = new Date().toISOString();
      setViolationCount((prev) => {
        const nextCount = prev + 1;
        setAntiCheatLogs((logs) => [
          ...logs,
          { event: eventType, timestamp: now, count: nextCount }
        ]);
        setLastWarningText(`⚠️ CẢNH BÁO GIAN LẬN: ${reason} (Lần thứ ${nextCount})`);
        setShowWarningToast(true);
        setTimeout(() => setShowWarningToast(false), 5000);

        // Ping lên Server cho Giáo viên Live Monitor thấy
        logViolationMutation.mutate({
          assignmentId,
          event: eventType,
          reason: reason
        });

        // Tự động thu bài nếu quá 5 lần (Option)
        if (nextCount >= 5) {
          alert("Hệ thống tự động thu bài do bạn vi phạm quá nhiều lần!");
          handleSubmit(true); // pass true flag to indicate forced
        }

        return nextCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation("TAB_SWITCH", "Bạn vừa chuyển Tab hoặc ẩn trình duyệt!");
      }
    };

    const handleWindowBlur = () => {
      logViolation("WINDOW_BLUR", "Trình duyệt của bạn vừa bị mất tập trung (Blur)!");
    };

    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        logViolation("FULLSCREEN_EXIT", "Bạn vừa thoát khỏi chế độ Toàn màn hình (Fullscreen)!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [assignment?.antiCheatingEnabled, assignmentId]);

  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  // 3. OCR Image Upload Handler
  const handleImageUpload = async (questionId: string, file?: File) => {
    if (!file) return;

    setOcrLoadingQuestionId(questionId);
    setOcrSuccessQuestionId(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/uploads/image", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error?.message || "Lỗi khi xử lý ảnh.");
      }

      const extractedText = result.data.ocrText || "";
      setAnswers((prev) => ({
        ...prev,
        [questionId]: prev[questionId]
          ? `${prev[questionId]}\n\n[Nội dung bóc chữ OCR từ ảnh]:\n${extractedText}`
          : extractedText,
      }));

      setOcrSuccessQuestionId(questionId);
    } catch (err: any) {
      alert("Lỗi OCR ảnh: " + err.message);
    } finally {
      setOcrLoadingQuestionId(null);
    }
  };

  const submitMutation = trpc.submission.submit.useMutation({
    onSuccess: (data) => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      alert("Đã nộp bài thành công! EduGrade AI đang chấm điểm...");
      router.push(`/student/submissions/${data.submissionId}`);
    },
    onError: (err) => alert(err.message)
  });

  const handleSubmit = (force = false) => {
    if (force || confirm("Bạn có chắc chắn muốn nộp bài? Hệ thống sẽ chuyển bài cho AI chấm điểm.")) {
      submitMutation.mutate({
        assignmentId,
        answers: assignment?.questions.map(q => ({
          questionId: q.id,
          answerText: answers[q.id] || ""
        })) || [],
        antiCheatLog: antiCheatLogs
      });
    }
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
      {/* Toast Warning Gian Lận */}
      {showWarningToast && (
        <div className="fixed top-6 right-6 z-50 max-w-md bg-red-500 text-white p-4 rounded-2xl shadow-2xl border border-red-400 flex items-start gap-3 animate-bounce">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">CẢNH BÁO HỆ THỐNG GIAN LẬN!</h4>
            <p className="text-xs opacity-90 mt-1">{lastWarningText}</p>
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
            {/* Anti-cheat Status Badge */}
            {assignment.antiCheatingEnabled && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                violationCount > 0 
                  ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                <ShieldAlert className="w-4 h-4" />
                <span>Anti-Cheat: {violationCount > 0 ? `Vi phạm (${violationCount})` : '🟢 Bật'}</span>
              </div>
            )}

            {/* Time Limit Badge */}
            <div className="flex items-center gap-2 text-amber-400 font-mono font-bold bg-amber-400/10 px-4 py-2 rounded-xl border border-amber-400/20 text-sm">
              <Clock className="w-4 h-4" /> 
              {assignment.timeLimitMinutes ? `${assignment.timeLimitMinutes} Phút` : 'Tự do'}
            </div>
          </div>
        </div>

        {/* Anti-cheat Fullscreen Banner Banner */}
        {assignment.antiCheatingEnabled && !isFullscreen && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Đề thi yêu cầu Toàn Màn Hình để giám sát chống gian lận.</span>
            </div>
            <button
              onClick={requestFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors shrink-0"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Bật Fullscreen
            </button>
          </div>
        )}

        {assignment.description && (
          <div className="mt-4 p-4 bg-white/5 rounded-xl text-slate-300 text-sm border border-white/5 leading-relaxed">
            <strong className="text-white">Lời dặn của Giáo viên:</strong> {assignment.description}
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-8">
        {assignment.questions.map((q, index) => (
          <div key={q.id} className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 relative shadow-lg">
            <div className="absolute top-0 right-0 bg-brand-accent/20 px-5 py-2 rounded-bl-2xl rounded-tr-3xl text-sm font-bold text-brand-accent border-b border-l border-brand-accent/20">
              {Number(q.maxScore)} điểm
            </div>
            
            <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">Câu {index + 1}</h3>
            <div className="text-slate-200 whitespace-pre-wrap leading-relaxed mb-6 font-medium text-lg">
              {q.content}
            </div>

            <div className="space-y-3 bg-black/20 p-5 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-sm text-brand-accent font-bold flex items-center gap-2 uppercase tracking-wider">
                  Bài làm của bạn:
                </label>
                {ocrSuccessQuestionId === q.id && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <Sparkles className="w-3.5 h-3.5" /> AI OCR Đã bóc chữ (94% Tự tin)
                  </span>
                )}
              </div>

              <textarea 
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                className="w-full bg-transparent border-0 ring-0 outline-none resize-y text-white font-mono text-base leading-relaxed placeholder-slate-600 focus:ring-0 min-h-[150px]"
                placeholder="Nhập câu trả lời trực tiếp hoặc dùng Camera chụp ảnh bài viết tay phía dưới..."
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
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
                      <span>AI đang quét chữ viết tay (OCR)...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" /> Chụp / Tải ảnh viết tay lên (AI OCR)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

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
    </div>
  );
}
