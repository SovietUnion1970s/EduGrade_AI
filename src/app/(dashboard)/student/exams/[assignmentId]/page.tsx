"use client";

import { trpc } from "@/lib/trpc";
import { compressImage } from "@/lib/image-compress";
import { 
  Clock, Send, Camera, CheckCircle2, ShieldAlert, Loader2, Maximize2, 
  AlertTriangle, Sparkles, Image as ImageIcon, Edit3, X, ZoomIn, 
  RefreshCw, UploadCloud, Trash2, FileText, Check, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { FeatureErrorBoundary } from "@/components/shared/feature-error-boundary";
import { MathRenderer } from "@/components/shared/math-renderer";

export default function ExamRoomPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;
  const router = useRouter();

  const { data: assignment, isLoading } = trpc.assignment.getById.useQuery({ id: assignmentId });

  // Answers text & file attachments per question
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerFiles, setAnswerFiles] = useState<Record<string, string>>({});
  const [ocrPreviewUrls, setOcrPreviewUrls] = useState<Record<string, string>>({});
  const [submissionModes, setSubmissionModes] = useState<Record<string, 'text' | 'image'>>({});

  // OCR state
  const [ocrLoadingQuestionId, setOcrLoadingQuestionId] = useState<string | null>(null);
  const [ocrSuccessQuestionId, setOcrSuccessQuestionId] = useState<string | null>(null);

  // Lightbox preview modal for uploaded photos
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Anti-cheat state
  const [antiCheatLogs, setAntiCheatLogs] = useState<Array<{ event: string; timestamp: string; count: number }>>([]);
  const [violationCount, setViolationCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasEnteredExam, setHasEnteredExam] = useState(false);

  // Anti-Cheat Safe Guard: When user opens file picker or camera, DO NOT count as violation!
  const isPickingFileRef = useRef(false);
  const pickingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to avoid stale closures
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const answerFilesRef = useRef(answerFiles);
  useEffect(() => { answerFilesRef.current = answerFiles; }, [answerFiles]);

  const antiCheatLogsRef = useRef(antiCheatLogs);
  useEffect(() => { antiCheatLogsRef.current = antiCheatLogs; }, [antiCheatLogs]);

  const violationCountRef = useRef(violationCount);
  useEffect(() => { violationCountRef.current = violationCount; }, [violationCount]);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const hasStartedRef = useRef(false);
  const examContainerRef = useRef<HTMLDivElement>(null);

  // Load draft from localStorage
  useEffect(() => {
    setIsFullscreen(!!document.fullscreenElement);
    const savedAnswers = localStorage.getItem(`draft_answers_${assignmentId}`);
    if (savedAnswers) {
      try { setAnswers(JSON.parse(savedAnswers)); } catch (e) {}
    }
    const savedFiles = localStorage.getItem(`draft_files_${assignmentId}`);
    if (savedFiles) {
      try {
        const parsedFiles = JSON.parse(savedFiles);
        setAnswerFiles(parsedFiles);
        setOcrPreviewUrls(parsedFiles);
      } catch (e) {}
    }
    const savedModes = localStorage.getItem(`draft_modes_${assignmentId}`);
    if (savedModes) {
      try { setSubmissionModes(JSON.parse(savedModes)); } catch (e) {}
    }
  }, [assignmentId]);

  // Save drafts
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(`draft_answers_${assignmentId}`, JSON.stringify(answers));
    }
    if (Object.keys(answerFiles).length > 0) {
      localStorage.setItem(`draft_files_${assignmentId}`, JSON.stringify(answerFiles));
    }
    if (Object.keys(submissionModes).length > 0) {
      localStorage.setItem(`draft_modes_${assignmentId}`, JSON.stringify(submissionModes));
    }
  }, [answers, answerFiles, submissionModes, assignmentId]);

  // Dialog modal state
  const [dialog, setDialog] = useState<{
    isOpen: boolean; title: string; message: string;
    type: 'info' | 'error' | 'confirm'; onConfirm?: () => void;
  }>({ isOpen: false, title: "", message: "", type: 'info' });

  const logViolationMutation = trpc.submission.logViolation.useMutation();
  const startExamMutation = trpc.submission.startExam.useMutation();

  const submitMutation = trpc.submission.submit.useMutation({
    onSuccess: (data) => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setDialog({
        isOpen: true,
        title: "Nộp bài thành công ✅",
        message: "Đã nộp bài thành công! EduGrade AI đang chấm điểm bất đồng bộ...",
        type: 'info',
        onConfirm: () => {
          localStorage.removeItem(`draft_answers_${assignmentId}`);
          localStorage.removeItem(`draft_files_${assignmentId}`);
          localStorage.removeItem(`draft_modes_${assignmentId}`);
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

  const submitMutationRef = useRef(submitMutation);
  useEffect(() => { submitMutationRef.current = submitMutation; }, [submitMutation]);

  const assignmentRef = useRef(assignment);
  useEffect(() => { assignmentRef.current = assignment; }, [assignment]);

  // Start exam once
  useEffect(() => {
    if (assignmentId && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startExamMutation.mutate({ assignmentId });
    }
  }, [assignmentId, startExamMutation]);

  // Anti-Cheat force submit
  const forceSubmit = useCallback((logs: Array<{ event: string; timestamp: string; count: number }>) => {
    const currentAssignment = assignmentRef.current;
    if (!currentAssignment) return;
    submitMutationRef.current.mutate({
      assignmentId,
      answers: currentAssignment.questions.map(q => ({
        questionId: q.id,
        answerText: answersRef.current[q.id] || "",
        answerFileUrl: answerFilesRef.current[q.id] || undefined
      })),
      antiCheatLog: logs
    });
  }, [assignmentId]);

  // Anti-Cheat event listener
  useEffect(() => {
    if (!assignment?.antiCheatingEnabled) return;

    const logViolation = (eventType: string, reason: string) => {
      // Bỏ qua nếu người dùng đang mở hộp thoại tải ảnh hoặc chụp camera
      if (isPickingFileRef.current) {
        return;
      }

      const now = new Date().toISOString();
      const nextCount = violationCountRef.current + 1;
      violationCountRef.current = nextCount;

      const newLog = { event: eventType, timestamp: now, count: nextCount };
      const updatedLogs = [...antiCheatLogsRef.current, newLog];

      setViolationCount(nextCount);
      setAntiCheatLogs(updatedLogs);
      antiCheatLogsRef.current = updatedLogs;

      toast.warning(`⚠️ Vi phạm lần ${nextCount}/5: ${reason}`, { duration: 5000 });
      logViolationMutation.mutate({ assignmentId, event: eventType, reason });

      if (nextCount >= 5) {
        toast.error("Hệ thống đã tự động thu bài do vi phạm quá 5 lần!", { duration: 10000 });
        forceSubmit(updatedLogs);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isPickingFileRef.current) {
        logViolation("TAB_SWITCH", "Chuyển Tab hoặc ẩn trình duyệt");
      }
    };

    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active && !isPickingFileRef.current && hasEnteredExam) {
        logViolation("FULLSCREEN_EXIT", "Thoát Toàn Màn Hình");
      }
    };

    // Khi người dùng focus lại cửa sổ sau khi chọn file xong
    const handleWindowFocus = () => {
      if (isPickingFileRef.current) {
        if (pickingTimeoutRef.current) clearTimeout(pickingTimeoutRef.current);
        pickingTimeoutRef.current = setTimeout(() => {
          isPickingFileRef.current = false;
        }, 1500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("focus", handleWindowFocus);
      if (pickingTimeoutRef.current) clearTimeout(pickingTimeoutRef.current);
    };
  }, [assignment?.antiCheatingEnabled, assignmentId, forceSubmit, hasEnteredExam, logViolationMutation]);

  const requestFullscreen = () => {
    setHasEnteredExam(true);
    if (examContainerRef.current) {
      examContainerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  // Safe file picker trigger: activates anti-cheat safe guard
  const triggerFileSelect = (questionId: string, isCamera = false) => {
    isPickingFileRef.current = true;
    if (pickingTimeoutRef.current) clearTimeout(pickingTimeoutRef.current);

    if (isCamera) {
      cameraInputRefs.current[questionId]?.click();
    } else {
      fileInputRefs.current[questionId]?.click();
    }
  };

  // Reset picking file status after file is chosen
  const onFileInputChange = async (questionId: string, file?: File) => {
    if (pickingTimeoutRef.current) clearTimeout(pickingTimeoutRef.current);
    pickingTimeoutRef.current = setTimeout(() => {
      isPickingFileRef.current = false;
    }, 2000);

    if (!file) return;
    await handleImageUpload(questionId, file);
  };

  // Upload and OCR processing
  const handleImageUpload = async (questionId: string, rawFile: File) => {
    setOcrLoadingQuestionId(questionId);
    setOcrSuccessQuestionId(null);

    // Tạo preview cục bộ ngay lập tức cho học sinh quan sát
    const localUrl = URL.createObjectURL(rawFile);
    setOcrPreviewUrls(prev => ({ ...prev, [questionId]: localUrl }));

    try {
      // 1. Tự động nén ảnh tại Client (tăng tương phản nét chữ, tối ưu độ phân giải 2048px)
      const compressed = await compressImage(rawFile, 2048, 2048, 0.85);

      // 2. Gửi file đã nén lên API endpoint kèm ngữ cảnh đề thi
      const formData = new FormData();
      formData.append("file", compressed);

      const currentQuestion = assignment?.questions.find(q => q.id === questionId);
      if (currentQuestion?.content) {
        formData.append("questionContent", currentQuestion.content);
      }
      if ((assignment?.class as any)?.subject) {
        formData.append("subject", (assignment!.class as any).subject);
      }
      if (assignment?.title) {
        formData.append("assignmentTitle", assignment.title);
      }

      const res = await fetch("/api/v1/uploads/image", { method: "POST", body: formData });
      const result = await res.json();

      if (!res.ok) {
        if (result.error?.details?.issues) {
          toast.warning("Chất lượng ảnh: " + result.error.details.issues, { duration: 8000 });
        }
        throw new Error(result.error?.message || "Lỗi khi xử lý ảnh.");
      }

      if (result.data.warning) {
        toast.warning("AI lưu ý về nét chữ: " + result.data.warning, { duration: 8000 });
      }

      const extractedText = result.data.ocrText || "";
      const cloudFileUrl = result.data.fileUrl || localUrl;

      // Lưu trữ file URL và văn bản OCR
      setAnswerFiles(prev => ({ ...prev, [questionId]: cloudFileUrl }));
      setAnswers(prev => ({
        ...prev,
        [questionId]: extractedText
      }));

      // Chuyển chế độ câu hỏi sang 'image' để học sinh thấy ảnh và kết quả OCR
      setSubmissionModes(prev => ({ ...prev, [questionId]: 'image' }));
      setOcrSuccessQuestionId(questionId);
      toast.success("Tải ảnh và nhận diện chữ viết tay thành công!");
    } catch (err: any) {
      toast.error("Lỗi OCR: " + err.message);
    } finally {
      setOcrLoadingQuestionId(null);
      if (fileInputRefs.current[questionId]) fileInputRefs.current[questionId]!.value = '';
      if (cameraInputRefs.current[questionId]) cameraInputRefs.current[questionId]!.value = '';
    }
  };

  const handleRemoveImage = (questionId: string) => {
    setAnswerFiles(prev => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
    setOcrPreviewUrls(prev => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
    setOcrSuccessQuestionId(null);
    toast.info("Đã xóa ảnh bài làm. Bạn có thể chụp lại hoặc gõ tự luận.");
  };

  const doSubmit = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
    submitMutation.mutate({
      assignmentId,
      answers: assignment!.questions.map(q => ({
        questionId: q.id,
        answerText: answers[q.id] || "",
        answerFileUrl: answerFiles[q.id] || undefined
      })),
      antiCheatLog: antiCheatLogs
    });
  };

  const handleSubmit = () => {
    const hasAnswered = Object.values(answers).some(ans => ans.trim().length > 0) || Object.values(answerFiles).some(f => !!f);
    if (!hasAnswered) {
      setDialog({
        isOpen: true,
        title: "Chưa làm bài",
        message: "Bạn chưa điền câu trả lời hay nộp ảnh nào. Vui lòng làm bài trước khi nộp!",
        type: 'error',
        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (assignment?.antiCheatingEnabled && !isFullscreen) {
      setDialog({
        isOpen: true,
        title: "Xác nhận nộp bài",
        message: "Hệ thống ghi nhận bạn đang ở ngoài chế độ toàn màn hình. Bạn có chắc chắn muốn nộp bài ngay bây giờ?",
        type: 'confirm',
        onConfirm: () => {
          doSubmit();
        }
      });
      return;
    }

    setDialog({
      isOpen: true,
      title: "Xác nhận nộp bài",
      message: "Bạn có chắc chắn muốn nộp bài? Hệ thống sẽ ghi nhận toàn bộ bài làm tự luận và hình ảnh đính kèm.",
      type: 'confirm',
      onConfirm: () => {
        doSubmit();
      }
    });
  };

  if (isLoading) return <div className="text-slate-400 text-center py-20">Đang tải cấu trúc đề thi...</div>;
  if (!assignment) return <div className="text-brand-danger text-center py-20">Không tìm thấy đề thi.</div>;

  // Nếu học sinh đã nộp rồi
  const submitted = assignment.submissions?.find(s => s.status !== 'IN_PROGRESS');
  if (submitted) {
    return (
      <div className="glass-panel p-12 rounded-3xl text-center max-w-2xl mx-auto mt-10 border border-emerald-500/30">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Bạn đã nộp bài này rồi</h2>
        <p className="text-slate-400 mb-8">Bài làm của bạn đang được hệ thống chấm điểm hoặc đã có kết quả.</p>
        <Link href={`/student/submissions/${submitted.id}`} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-premium">
          Xem chi tiết kết quả
        </Link>
      </div>
    );
  }

  // Màn hình bắt đầu vào thi (Lần đầu tiên nếu bật Anti-cheat)
  const showInitialFullscreenGateway = assignment.antiCheatingEnabled && !hasEnteredExam && !isFullscreen;

  return (
    <div ref={examContainerRef} className="max-w-4xl mx-auto space-y-8 pb-20 relative bg-[#0a0f1c] min-h-screen p-4 sm:p-8">
      
      {/* Lightbox Preview Modal phóng to ảnh */}
      {previewImageModal && (
        <div 
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-12 right-0 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={previewImageModal} 
              alt="Chi tiết bài làm" 
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/20"
            />
            <p className="text-xs text-slate-300 mt-2 font-medium">Bấm vùng ngoài hoặc nút X để đóng</p>
          </div>
        </div>
      )}

      {/* Confirmation & Alert Dialog */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700/50 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <h3 className={`text-xl font-bold mb-2 ${dialog.type === 'error' ? 'text-red-400' : 'text-white'}`}>
              {dialog.title}
            </h3>
            <p className="text-slate-300 mb-6 text-sm leading-relaxed">{dialog.message}</p>
            <div className="flex justify-end gap-3">
              {dialog.type === 'confirm' && (
                <button
                  onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors font-medium text-sm"
                >
                  Hủy bỏ
                </button>
              )}
              <button
                onClick={dialog.onConfirm || (() => setDialog(prev => ({ ...prev, isOpen: false })))}
                className={`px-6 py-2 rounded-xl text-white font-bold text-sm transition-colors ${
                  dialog.type === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-accent hover:bg-indigo-600'
                }`}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Warning Modal Overlay (Khi bị thoát Fullscreen trong quá trình làm bài, KHÔNG UNMOUNT FORM) */}
      {assignment.antiCheatingEnabled && hasEnteredExam && !isFullscreen && !isPickingFileRef.current && (
        <div className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-amber-500/40 rounded-3xl p-8 max-w-lg w-full text-center shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-in fade-in">
            <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-white mb-2">Đang ngoài chế độ Toàn Màn Hình</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Bài thi này kích hoạt tính năng chống gian lận. Bạn phải luôn duy trì toàn màn hình trong lúc làm bài để không bị ghi nhận vi phạm.
            </p>
            <button
              onClick={requestFullscreen}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-2xl font-extrabold text-base transition-all shadow-lg"
            >
              <Maximize2 className="w-5 h-5" /> Bật lại Toàn Màn Hình & Tiếp tục
            </button>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="glass-panel p-6 rounded-3xl border-t-4 border-t-brand-accent sticky top-4 z-10 backdrop-blur-xl bg-[#0a0f1c]/80 shadow-premium">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white mb-1">{assignment.title}</h1>
            <p className="text-slate-400 text-sm font-medium">Lớp: {assignment.class.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {assignment.antiCheatingEnabled && (
              <button
                type="button"
                onClick={requestFullscreen}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isFullscreen 
                    ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10' 
                    : 'bg-amber-500 hover:bg-amber-400 text-black border-amber-400 font-extrabold shadow-md'
                }`}
                title={isFullscreen ? "Đang ở chế độ Toàn màn hình" : "Bấm để bật Toàn màn hình"}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{isFullscreen ? "Toàn màn hình" : "Bật Fullscreen"}</span>
              </button>
            )}
            {assignment.antiCheatingEnabled && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                violationCount > 0
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                <ShieldAlert className="w-4 h-4" />
                <span>Chống gian lận: {violationCount > 0 ? `Vi phạm (${violationCount}/5)` : 'Bật (0 vi phạm)'}</span>
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

      {/* Initial Gateway if Anti-cheat is enabled */}
      {showInitialFullscreenGateway ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-amber-500/30 max-w-xl mx-auto mt-10">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-3">Yêu cầu Bật Toàn Màn Hình</h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Bài thi này bật tính năng chống gian lận. Bạn <strong>BẮT BUỘC</strong> làm bài ở chế độ toàn màn hình.
            Hệ thống hỗ trợ chụp/tải ảnh bài làm viết tay an toàn mà không tính là vi phạm.
          </p>
          <button
            onClick={requestFullscreen}
            className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 rounded-xl font-extrabold transition-all shadow-premium text-lg"
          >
            <Maximize2 className="w-5 h-5" /> Bật Fullscreen & Vào thi ngay
          </button>
        </div>
      ) : (
        <>
          {/* Danh sách các câu hỏi */}
          <div className="space-y-8">
            {assignment.questions.map((q, index) => {
              const currentMode = submissionModes[q.id] || (answerFiles[q.id] ? 'image' : 'text');
              const currentText = answers[q.id] || "";
              const currentImageUrl = ocrPreviewUrls[q.id] || answerFiles[q.id];
              const isOcrLoading = ocrLoadingQuestionId === q.id;
              const isOcrSuccess = ocrSuccessQuestionId === q.id;

              return (
                <div key={q.id} className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 relative shadow-lg">
                  {/* Điểm tối đa */}
                  <div className="absolute top-0 right-0 bg-brand-accent/20 px-5 py-2 rounded-bl-2xl rounded-tr-3xl text-sm font-bold text-brand-accent border-b border-l border-brand-accent/20">
                    {Number(q.maxScore)} điểm
                  </div>

                  <h3 className="font-bold text-lg mb-3 text-white flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sm font-black text-brand-accent">
                      {index + 1}
                    </span>
                    Câu hỏi {index + 1}
                  </h3>

                  <div className="text-slate-200 leading-relaxed mb-6 font-medium text-lg">
                    <MathRenderer content={q.content} />
                  </div>

                  {/* THANH CHỌN 2 HÌNH THỨC NỘP BÀI: TỰ LUẬN HOẶC NỘP ẢNH */}
                  <div className="bg-black/30 p-5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Hình thức làm bài:</span>
                        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
                          <button
                            type="button"
                            onClick={() => setSubmissionModes(prev => ({ ...prev, [q.id]: 'text' }))}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              currentMode === 'text'
                                ? 'bg-brand-accent text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Làm tự luận trực tiếp
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubmissionModes(prev => ({ ...prev, [q.id]: 'image' }))}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              currentMode === 'image'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Camera className="w-3.5 h-3.5" /> Nộp ảnh viết tay (AI OCR)
                          </button>
                        </div>
                      </div>

                      {/* Thông báo trạng thái OCR */}
                      {isOcrSuccess && (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          <Sparkles className="w-3.5 h-3.5" /> AI OCR đã bóc chữ
                        </span>
                      )}
                    </div>

                    {/* Hidden inputs cho File & Camera */}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[q.id] = el; }}
                      onChange={(e) => onFileInputChange(q.id, e.target.files?.[0])}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      ref={(el) => { cameraInputRefs.current[q.id] = el; }}
                      onChange={(e) => onFileInputChange(q.id, e.target.files?.[0])}
                    />

                    {/* CÁCH 1: LÀM TỰ LUẬN TRỰC TIẾP */}
                    {currentMode === 'text' && (
                      <div className="space-y-3">
                        <textarea
                          value={currentText}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          className="w-full bg-black/20 p-4 rounded-xl border border-white/10 text-white font-mono text-base leading-relaxed placeholder-slate-500 focus:outline-none focus:border-brand-accent/60 min-h-[160px] resize-y transition-all"
                          placeholder="Nhập nội dung bài làm tự luận của bạn tại đây..."
                        />
                        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                          <span>{currentText.trim() ? `${currentText.trim().split(/\s+/).length} từ` : '0 từ'} • {currentText.length} ký tự</span>
                          <span className="text-slate-500 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" /> Tự động lưu nháp
                          </span>
                        </div>
                      </div>
                    )}

                    {/* CÁCH 2: NỘP BẰNG HÌNH ẢNH VIẾT TAY (AI OCR) */}
                    {currentMode === 'image' && (
                      <FeatureErrorBoundary featureName="Nộp ảnh & Nhận diện chữ OCR">
                        <div className="space-y-4">
                          {/* Nếu chưa tải ảnh lên */}
                          {!currentImageUrl ? (
                            <div className="p-8 border-2 border-dashed border-white/15 rounded-2xl text-center space-y-4 hover:border-brand-accent/40 transition-colors bg-white/[0.02]">
                              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-brand-accent">
                                <ImageIcon className="w-7 h-7" />
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-base">Chụp hoặc Tải ảnh bài viết tay</h4>
                                <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto leading-relaxed">
                                  Ảnh chụp sẽ được tự động nén tối ưu dung lượng và trích xuất chữ viết tay (AI OCR) để chấm điểm chính xác.
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                <button
                                  type="button"
                                  onClick={() => triggerFileSelect(q.id, true)}
                                  disabled={isOcrLoading}
                                  className="flex items-center gap-2 px-5 py-3 bg-brand-accent hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
                                >
                                  <Camera className="w-4 h-4" /> Mở Camera chụp ảnh
                                </button>
                                <button
                                  type="button"
                                  onClick={() => triggerFileSelect(q.id, false)}
                                  disabled={isOcrLoading}
                                  className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10 disabled:opacity-50"
                                >
                                  <UploadCloud className="w-4 h-4" /> Chọn ảnh từ máy tính / thư viện
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Nếu ĐÃ có ảnh bài làm */
                            <div className="space-y-4">
                              {/* Card xem trước ảnh và công cụ */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-4">
                                  <div 
                                    className="relative group cursor-pointer overflow-hidden rounded-xl border border-white/20 w-24 h-24 bg-black/40 flex-shrink-0"
                                    onClick={() => setPreviewImageModal(currentImageUrl)}
                                  >
                                    <img 
                                      src={currentImageUrl} 
                                      alt="Bài làm" 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <ZoomIn className="w-6 h-6 text-white" />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-bold text-white text-sm">Ảnh bài làm viết tay đã nộp</h5>
                                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                                        Đã đính kèm
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Bấm vào hình để phóng to kiểm tra độ nét.</p>
                                    <div className="flex items-center gap-3 mt-3">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewImageModal(currentImageUrl)}
                                        className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1"
                                      >
                                        <ZoomIn className="w-3.5 h-3.5" /> Xem cỡ lớn
                                      </button>
                                      <span className="text-white/20">•</span>
                                      <button
                                        type="button"
                                        onClick={() => triggerFileSelect(q.id, false)}
                                        disabled={isOcrLoading}
                                        className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" /> Chụp/Đổi ảnh khác
                                      </button>
                                      <span className="text-white/20">•</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveImage(q.id)}
                                        className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Xóa ảnh
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Khung nội dung OCR và cho phép chỉnh sửa */}
                              <div className="space-y-2 pt-2">
                                <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-brand-accent" />
                                    Nội dung AI trích xuất từ ảnh (OCR):
                                  </label>
                                  <span className="text-[11px] text-slate-400 italic">
                                    Bạn có thể sửa lại các từ ngữ nếu chữ viết tay bị đọc nhầm
                                  </span>
                                </div>

                                {isOcrLoading ? (
                                  <div className="p-8 rounded-xl bg-black/30 border border-brand-accent/30 text-center space-y-3">
                                    <Loader2 className="w-8 h-8 text-brand-accent animate-spin mx-auto" />
                                    <p className="text-sm font-bold text-white">AI Gemini Vision đang quét và trích xuất chữ viết tay...</p>
                                    <p className="text-xs text-slate-400">Quá trình này mất khoảng 2-4 giây.</p>
                                  </div>
                                ) : (
                                  <textarea
                                    value={currentText}
                                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    className="w-full bg-black/20 p-4 rounded-xl border border-white/10 text-white font-mono text-base leading-relaxed placeholder-slate-500 focus:outline-none focus:border-brand-accent/60 min-h-[140px] resize-y transition-all"
                                    placeholder="Chưa có nội dung văn bản. Bạn có thể tự gõ bổ sung..."
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </FeatureErrorBoundary>
                    )}
                  </div>
                </div>
              );
            })}
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
