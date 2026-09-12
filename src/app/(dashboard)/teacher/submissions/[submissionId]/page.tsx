"use client";

import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bot, CheckCircle, ShieldAlert, FileText, User, Save, Send, AlertTriangle, MessageSquare, Sparkles, ZoomIn, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { toast } from "sonner";
import { MathRenderer } from "@/components/shared/math-renderer";

export default function TeacherDualColumnGradingPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: submission, isLoading: isLoadingSub } = trpc.submission.getById.useQuery({ id: submissionId });
  const { data: grade, isLoading: isLoadingGrade } = trpc.grade.get.useQuery({ submissionId });
  const { data: appeals } = trpc.grade.getAppeals.useQuery({ gradeId: grade?.id || "" }, { enabled: !!grade?.id });

  // State for Override scores
  const [editedScores, setEditedScores] = useState<Record<string, { score: string; comment: string }>>({});
  const [overrideReason, setOverrideReason] = useState("");
  const [appealResponses, setAppealResponses] = useState<Record<string, string>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (grade?.breakdowns) {
      const initial: Record<string, { score: string; comment: string }> = {};
      grade.breakdowns.forEach((b) => {
        initial[b.id] = {
          score: String(b.scoreAwarded),
          comment: b.teacherComment || "",
        };
      });
      setEditedScores(initial);
    }
  }, [grade]);

  const overrideMutation = trpc.grade.override.useMutation({
    onSuccess: () => {
      utils.grade.get.invalidate({ submissionId });
      toast.success("Đã cập nhật & ghi đè điểm số thành công!");
    },
    onError: (err) => toast.error("Lỗi ghi đè điểm: " + err.message),
  });

  const publishMutation = trpc.grade.publish.useMutation({
    onSuccess: () => {
      utils.grade.get.invalidate({ submissionId });
      toast.success("Đã công bố điểm cho học sinh thành công!");
    },
    onError: (err) => toast.error("Lỗi công bố điểm: " + err.message),
  });

  const resolveAppealMutation = trpc.grade.resolveAppeal.useMutation({
    onSuccess: () => {
      utils.grade.getAppeals.invalidate({ gradeId: grade?.id || "" });
      toast.success("Đã phản hồi đơn phúc khảo!");
    },
    onError: (err) => toast.error("Lỗi xử lý phúc khảo: " + err.message),
  });

  const triggerAiGradingMutation = trpc.grade.triggerAiGrading.useMutation({
    onSuccess: () => {
      utils.grade.get.invalidate({ submissionId });
      toast.success("AI đã chấm xong!");
    },
    onError: (err) => toast.error("Lỗi khi chấm AI: " + err.message),
  });

  const createManualDraftMutation = trpc.grade.createManualDraft.useMutation({
    onSuccess: () => {
      utils.grade.get.invalidate({ submissionId });
      toast.success("Đã bật chế độ chấm thủ công!");
    },
    onError: (err) => toast.error("Lỗi: " + err.message),
  });

  const handleSaveOverride = () => {
    if (!grade) return;
    if (!overrideReason || overrideReason.trim().length < 5) {
      toast.error("Giáo viên vui lòng ghi rõ lý do sửa điểm (tối thiểu 5 ký tự).");
      return;
    }

    const overrides = Object.entries(editedScores).map(([breakdownId, data]) => ({
      breakdownId,
      newScore: parseFloat(data.score) || 0,
      teacherComment: data.comment,
    }));

    overrideMutation.mutate({
      gradeId: grade.id,
      overrides,
      reason: overrideReason,
    });
  };

  const handlePublish = () => {
    if (!grade) return;
    if (window.confirm("Xác nhận phê duyệt và công bố điểm bài thi này cho học sinh?")) {
      publishMutation.mutate({ gradeId: grade.id });
    }
  };

  if (isLoadingSub) return <div className="text-slate-400 text-center py-20">Đang tải thông tin bài nộp...</div>;
  if (!submission) return <div className="text-brand-danger text-center py-20">Không tìm thấy bài nộp.</div>;

  const antiCheatLogs = (submission.antiCheatLog as any[]) || [];
  const violationCount = antiCheatLogs.length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      {/* Top Bar Navigation */}
      <div className="glass-panel p-5 rounded-3xl border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-white">Chấm điểm & Duyệt bài thi (Dual-Column Grading)</h1>
            <p className="text-xs text-slate-400">Đề thi: {submission.assignment.title} • Lớp: {submission.assignment.class.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {grade && (
            <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold border ${
              grade.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              grade.status === 'OVERRIDDEN' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
              'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}>
              {grade.status === 'APPROVED' ? '✅ Đã công bố' : grade.status === 'OVERRIDDEN' ? '✏️ Đã ghi đè điểm' : '🤖 AI Chấm bản nháp'}
            </span>
          )}

          {grade && grade.status !== 'APPROVED' && (
            <button
              onClick={handlePublish}
              disabled={publishMutation.isPending}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-premium transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> Phê duyệt & Công bố
            </button>
          )}
        </div>
      </div>

      {/* Dual Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CỘT TRÁI: Bài làm của Học sinh & Chứng cứ Anti-Cheat */}
        <div className="space-y-6">
          {/* Học sinh info & Anti-cheat card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center font-bold text-brand-accent">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{submission.student.fullName}</h3>
                  <p className="text-xs text-slate-400">{submission.student.email}</p>
                </div>
              </div>

              <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                violationCount >= 5 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                violationCount >= 1 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                <ShieldAlert className="w-4 h-4" />
                <span>Anti-Cheat: {violationCount} vi phạm ({violationCount >= 5 ? 'Cao' : violationCount >= 1 ? 'Trung bình' : 'An toàn'})</span>
              </div>
            </div>

            {violationCount > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 space-y-1">
                <strong className="block text-red-400 font-bold">Nhật ký nghi vấn gian lận:</strong>
                {antiCheatLogs.map((log: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 opacity-90">
                    <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                    <span>{log.event}: {new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bài làm từng câu */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-accent" /> Bài làm của Học sinh
            </h2>

            {submission.answers.map((ans, index) => (
              <div key={ans.id} className="glass-panel p-6 rounded-3xl border border-white/5 space-y-3 relative">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="font-bold text-white flex-1 pr-4">
                    <span className="text-brand-accent mr-1">Câu {index + 1}:</span>
                    <MathRenderer content={ans.question.content} className="inline" />
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">Điểm tối đa: {Number(ans.question.maxScore)}đ</span>
                </div>

                <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-2">
                  <p className="text-xs text-slate-400 font-bold uppercase">Nội dung học sinh nhập:</p>
                  <div className="text-slate-200 text-sm leading-relaxed">
                    {ans.answerText ? (
                      <MathRenderer content={ans.answerText} />
                    ) : (
                      <em className="text-slate-600">Học sinh không nhập văn bản.</em>
                    )}
                  </div>

                  {ans.answerFileUrl && (
                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <div className="text-xs text-emerald-400 flex items-center gap-2 font-semibold">
                        <Sparkles className="w-4 h-4" /> Đã bóc chữ OCR từ Ảnh làm bài viết tay
                      </div>
                      <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 hover:border-brand-accent/40 transition-colors">
                        <div 
                          className="relative group cursor-pointer overflow-hidden rounded-xl border border-white/20 w-16 h-16 bg-black/40 flex-shrink-0"
                          onClick={() => setLightboxImage(ans.answerFileUrl)}
                        >
                          <img 
                            src={ans.answerFileUrl} 
                            alt="Ảnh bài làm viết tay" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-brand-accent" />
                            Ảnh gốc viết tay học sinh đã nộp
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Bấm vào ảnh để phóng to đối chiếu nét chữ với text bóc tách.</p>
                          <button
                            type="button"
                            onClick={() => setLightboxImage(ans.answerFileUrl)}
                            className="text-xs text-brand-accent hover:underline flex items-center gap-1 mt-1 font-bold"
                          >
                            <ZoomIn className="w-3.5 h-3.5" /> Phóng to xem ảnh gốc
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CỘT PHẢI: AI Chấm & Bảng Ghi Đè Điểm dành cho Giáo Viên */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-brand-accent/30 bg-brand-accent/5 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-brand-accent" /> AI Đánh Giá & Ghi Đè Điểm
                </h2>
                <p className="text-xs text-slate-400 mt-1 mb-3">Giáo viên có thể chỉnh sửa điểm và nhận xét của AI dưới đây.</p>
                {grade && grade.status !== 'APPROVED' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (window.confirm("Thao tác này sẽ xóa điểm AI hiện tại và yêu cầu AI chấm lại từ đầu. Bạn có chắc chắn?")) {
                          triggerAiGradingMutation.mutate({ submissionId });
                        }
                      }}
                      disabled={triggerAiGradingMutation.isPending}
                      className="px-3 py-1.5 bg-brand-accent/20 hover:bg-brand-accent text-brand-accent hover:text-white rounded-lg text-[11px] font-bold transition-all border border-brand-accent/30 disabled:opacity-50"
                    >
                      {triggerAiGradingMutation.isPending ? "Đang chấm lại..." : "🔄 Yêu cầu AI chấm lại"}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Thao tác này sẽ xóa điểm AI hiện tại và chuyển sang chế độ chấm thủ công 100%. Bạn có chắc chắn?")) {
                          createManualDraftMutation.mutate({ submissionId });
                        }
                      }}
                      disabled={createManualDraftMutation.isPending}
                      className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
                    >
                      {createManualDraftMutation.isPending ? "Đang reset..." : "🧹 Chuyển sang chấm tay"}
                    </button>
                  </div>
                )}
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Tổng điểm</span>
                <span className="text-3xl font-black text-emerald-400">
                  {Number(grade?.totalScore || grade?.aiTotalScore || 0).toFixed(1)} <span className="text-sm font-medium text-slate-400">/ 10</span>
                </span>
              </div>
            </div>

            {/* Trạng thái chưa có điểm AI */}
            {isLoadingGrade && <div className="text-center py-6 text-slate-400">Đang tải điểm...</div>}
            
            {!isLoadingGrade && !grade && (
              <div className="text-center py-8">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <p className="text-slate-300 mb-4">Chưa có kết quả chấm điểm từ AI (hoặc bạn muốn tự chấm hoàn toàn).</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => triggerAiGradingMutation.mutate({ submissionId })}
                    disabled={triggerAiGradingMutation.isPending || createManualDraftMutation.isPending}
                    className="bg-brand-accent hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-premium disabled:opacity-50"
                  >
                    {triggerAiGradingMutation.isPending ? "AI Đang chấm..." : "Tham khảo AI chấm"}
                  </button>
                  <button
                    onClick={() => createManualDraftMutation.mutate({ submissionId })}
                    disabled={createManualDraftMutation.isPending || triggerAiGradingMutation.isPending}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-premium disabled:opacity-50"
                  >
                    {createManualDraftMutation.isPending ? "Đang xử lý..." : "Chấm thủ công (Bỏ qua AI)"}
                  </button>
                </div>
              </div>
            )}

            {/* Chi tiết từng Breakdown điểm */}
            {grade?.breakdowns.map((bd) => (
              <div key={bd.id} className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">Câu hỏi: {bd.question.content}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    bd.confidenceLevel === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                    bd.confidenceLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    Độ tin cậy AI: {bd.confidenceLevel || 'HIGH'}
                  </span>
                </div>

                <div className="p-3 bg-white/5 rounded-xl text-xs text-slate-300 leading-relaxed">
                  <strong className="text-brand-accent">Phân tích từ AI:</strong> {bd.aiReasoning}
                </div>

                {/* Chỉnh sửa điểm & nhận xét cho câu này */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-bold">Điểm Giáo Viên cho:</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max={Number(bd.question.maxScore)}
                      value={editedScores[bd.id]?.score || ""}
                      onChange={(e) => setEditedScores({
                        ...editedScores,
                        [bd.id]: { ...editedScores[bd.id], score: e.target.value }
                      })}
                      className="glass-input w-full px-3 py-1.5 rounded-xl text-sm font-bold text-emerald-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1 font-bold">Ghi chú riêng cho câu này:</label>
                    <input
                      type="text"
                      value={editedScores[bd.id]?.comment || ""}
                      onChange={(e) => setEditedScores({
                        ...editedScores,
                        [bd.id]: { ...editedScores[bd.id], comment: e.target.value }
                      })}
                      className="glass-input w-full px-3 py-1.5 rounded-xl text-xs text-white"
                      placeholder="Ghi chú nhận xét của Giáo viên..."
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Lý do ghi đè bắt buộc */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Lý do chỉnh sửa / Ghi đè điểm (Bắt buộc phục vụ lưu vết Audit Log):
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="glass-input w-full p-3 rounded-xl text-xs text-white h-20 resize-none"
                placeholder="Nhập lý do điều chỉnh điểm (Ví dụ: Chấm nới tay câu 2, đã kiểm tra ảnh OCR...)..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveOverride}
                disabled={overrideMutation.isPending}
                className="flex items-center gap-2 bg-brand-accent hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-premium disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {overrideMutation.isPending ? "Đang lưu..." : "Lưu & Ghi Đè Điểm"}
              </button>
            </div>
          </div>

          {/* GIAO DIỆN XỬ LÝ ĐƠN PHÚC KHẢO (APPEALS MANAGEMENT) */}
          {appeals && appeals.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-amber-500/5 space-y-4">
              <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Đơn Xin Phúc Khảo Từ Học Sinh ({appeals.length})
              </h3>

              {appeals.map((app) => (
                <div key={app.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{app.student.fullName} ({app.student.email})</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      app.status === 'RESOLVED_APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                      app.status === 'RESOLVED_REJECTED' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400 animate-pulse'
                    }`}>
                      {app.status === 'RESOLVED_APPROVED' ? 'Chấp nhận' : app.status === 'RESOLVED_REJECTED' ? 'Từ chối' : 'Chờ xử lý'}
                    </span>
                  </div>

                  <p className="text-slate-300 italic bg-white/5 p-3 rounded-xl border border-white/5">
                    "{app.reason}"
                  </p>

                  {app.teacherResponse ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300">
                      <strong>Phản hồi của GV:</strong> {app.teacherResponse}
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <input
                        type="text"
                        value={appealResponses[app.id] || ""}
                        onChange={(e) => setAppealResponses({ ...appealResponses, [app.id]: e.target.value })}
                        placeholder="Nhập lời phản hồi của Giáo viên..."
                        className="glass-input w-full p-2.5 rounded-xl text-xs text-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => resolveAppealMutation.mutate({
                            appealId: app.id,
                            status: 'RESOLVED_REJECTED',
                            teacherResponse: appealResponses[app.id] || 'Đã kiểm tra, giữ nguyên điểm số.'
                          })}
                          disabled={resolveAppealMutation.isPending}
                          className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-xl font-bold transition-all"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() => resolveAppealMutation.mutate({
                            appealId: app.id,
                            status: 'RESOLVED_APPROVED',
                            teacherResponse: appealResponses[app.id] || 'Đã đồng ý điều chỉnh điểm.'
                          })}
                          disabled={resolveAppealMutation.isPending}
                          className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all"
                        >
                          Chấp nhận điều chỉnh
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal phóng to ảnh bài làm viết tay */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={lightboxImage} 
              alt="Ảnh bài làm viết tay của học sinh" 
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/20"
            />
            <p className="text-xs text-slate-300 mt-2 font-medium">Bấm vùng tối bên ngoài hoặc nút X để đóng</p>
          </div>
        </div>
      )}
    </div>
  );
}
