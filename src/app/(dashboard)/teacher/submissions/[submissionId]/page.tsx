"use client";

import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bot, CheckCircle, ShieldAlert, FileText, User, Save, Send, AlertTriangle, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

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
      alert("Đã cập nhật & ghi đè điểm số thành công!");
    },
    onError: (err) => alert("Lỗi ghi đè điểm: " + err.message),
  });

  const publishMutation = trpc.grade.publish.useMutation({
    onSuccess: () => {
      utils.grade.get.invalidate({ submissionId });
      alert("Đã công bố điểm cho học sinh thành công!");
    },
    onError: (err) => alert("Lỗi công bố điểm: " + err.message),
  });

  const resolveAppealMutation = trpc.grade.resolveAppeal.useMutation({
    onSuccess: () => {
      utils.grade.getAppeals.invalidate({ gradeId: grade?.id || "" });
      alert("Đã phản hồi đơn phúc khảo!");
    },
    onError: (err) => alert("Lỗi xử lý phúc khảo: " + err.message),
  });

  const handleSaveOverride = () => {
    if (!grade) return;
    if (!overrideReason || overrideReason.trim().length < 5) {
      alert("Giáo viên vui lòng ghi rõ lý do sửa điểm (tối thiểu 5 ký tự).");
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
    if (confirm("Xác nhận phê duyệt và công bố điểm bài thi này cho học sinh?")) {
      publishMutation.mutate({ gradeId: grade.id });
    }
  };

  if (isLoadingSub || isLoadingGrade) return <div className="text-slate-400 text-center py-20">Đang tải bảng chấm điểm 2 cột...</div>;
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
                  <span className="font-bold text-white">Câu {index + 1}: {ans.question.content}</span>
                  <span className="text-xs text-slate-400">Điểm tối đa: {Number(ans.question.maxScore)}đ</span>
                </div>

                <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-2">
                  <p className="text-xs text-slate-400 font-bold uppercase">Nội dung học sinh nhập:</p>
                  <p className="text-slate-200 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                    {ans.answerText || <em className="text-slate-600">Học sinh không nhập văn bản.</em>}
                  </p>

                  {ans.answerFileUrl && (
                    <div className="pt-2 border-t border-white/5 text-xs text-emerald-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Đã bóc chữ OCR từ Ảnh làm bài
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
                <p className="text-xs text-slate-400 mt-1">Giáo viên có thể chỉnh sửa điểm và nhận xét của AI dưới đây.</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Tổng điểm</span>
                <span className="text-3xl font-black text-emerald-400">
                  {Number(grade?.totalScore || grade?.aiTotalScore || 0).toFixed(1)} <span className="text-sm font-medium text-slate-400">/ 10</span>
                </span>
              </div>
            </div>

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
    </div>
  );
}
