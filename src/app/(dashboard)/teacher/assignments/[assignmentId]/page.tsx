"use client";

import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle, Plus, BrainCircuit, AlignLeft, ShieldAlert, AlertTriangle, Clock, Download } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { QuestionType } from "@prisma/client";
import { toast } from "sonner";
import { MathRenderer } from "@/components/shared/math-renderer";
import { MathToolbar } from "@/components/shared/math-toolbar";

export default function AssignmentEditorPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;
  const utils = trpc.useUtils();
  const router = useRouter();
  
  const { data: assignment, isLoading } = trpc.assignment.getById.useQuery({ id: assignmentId });
  const { data: antiCheatReport } = trpc.submission.getAntiCheatReport.useQuery({ assignmentId }, { refetchInterval: 3000 });
  
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [content, setContent] = useState("");
  const [maxScore, setMaxScore] = useState("10");

  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = async () => {
    if (!assignment) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/v1/classes/${assignment.classId}/assignments/${assignmentId}/export-excel`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Không thể tạo file Excel');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BangDiem_${assignment.class.name}_${assignment.title}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Đã xuất báo cáo bảng điểm Excel thành công!");
    } catch (err: any) {
      toast.error("Lỗi xuất Excel: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/v1/assignments/${assignmentId}/generate-questions`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      
      if (!res.ok) {
        toast.error("Lỗi: " + result.error.message);
        if (result.error.details?.issues) {
          toast.warning("AI cảnh báo: " + result.error.details.issues);
        }
      } else {
        toast.success(`Đã tạo thành công ${result.data.count} câu hỏi từ file!`);
        if (result.data.warning) {
          toast.warning("AI lưu ý: " + result.data.warning);
        }
        utils.assignment.getById.invalidate({ id: assignmentId });
      }
    } catch (err: any) {
      toast.error("Lỗi tải file: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addQuestionMutation = trpc.assignment.addQuestion.useMutation({
    onSuccess: () => {
      utils.assignment.getById.invalidate({ id: assignmentId });
      setIsAddingQuestion(false);
      setContent("");
      setMaxScore("10");
    }
  });

  const publishMutation = trpc.assignment.publish.useMutation({
    onSuccess: () => {
      utils.assignment.getById.invalidate({ id: assignmentId });
      alert("Đã công bố đề thi thành công!");
      router.push(`/teacher/classes/${assignment?.classId}`);
    }
  });

  if (isLoading) return <div className="text-slate-400">Đang tải đề thi...</div>;
  if (!assignment) return <div className="text-brand-danger">Không tìm thấy đề thi.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-brand-accent shadow-premium">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div>
            <Link href={`/teacher/classes/${assignment.classId}`} className="text-sm text-slate-400 hover:text-white flex items-center gap-1 mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Quay lại lớp {assignment.class.name}
            </Link>
            <h1 className="text-2xl font-bold text-white mb-2">{assignment.title}</h1>
            <div className="flex items-center gap-3 text-sm">
              <span className={`px-3 py-1 rounded-full font-bold ${assignment.status === 'DRAFT' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                {assignment.status === 'DRAFT' ? 'Đang soạn thảo' : 'Đã công bố'}
              </span>
              <span className="text-slate-400 flex items-center gap-1"><BrainCircuit className="w-4 h-4"/> {assignment.gradingStyle}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Nút Xuất Bảng Điểm Excel */}
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              {isExporting ? "Đang tạo file..." : "Xuất Bảng Điểm (.xlsx)"}
            </button>

            {assignment.status === 'DRAFT' && (
              <button 
                onClick={() => publishMutation.mutate({ id: assignmentId })}
                disabled={assignment.questions.length === 0 || publishMutation.isPending}
                className="flex items-center justify-center gap-2 bg-brand-accent hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-premium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" /> Công bố đề thi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <AlignLeft className="w-5 h-5 text-brand-accent" /> Danh sách câu hỏi ({assignment.questions.length})
        </h2>
        
        {assignment.questions.map((q, index) => (
          <div key={q.id} className="glass-panel p-6 rounded-2xl border border-white/5 relative group">
            <div className="absolute top-0 right-0 bg-brand-accent/20 px-4 py-1.5 rounded-bl-xl rounded-tr-2xl text-sm font-bold text-brand-accent">
              {Number(q.maxScore)} điểm
            </div>
            <h3 className="font-bold text-lg mb-3 text-white flex items-center gap-2">Câu {index + 1}</h3>
            <div className="text-slate-300 leading-relaxed bg-white/5 p-4 rounded-xl">
              <MathRenderer content={q.content} />
            </div>
          </div>
        ))}

        {/* Add Question Form */}
        {assignment.status === 'DRAFT' && (
          isAddingQuestion ? (
            <div className="glass-panel p-6 rounded-2xl border border-brand-accent/30 bg-brand-accent/5">
              <h3 className="font-bold mb-4 text-white">Thêm câu hỏi tự luận mới</h3>
              <div className="space-y-4">
                <div>
                  <MathToolbar
                    label="Soạn thảo Đề bài & Công thức Toán KaTeX"
                    currentValue={content}
                    onInsert={(snippet) => setContent(prev => prev + snippet)}
                  />
                  <textarea 
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="glass-input w-full p-4 rounded-xl h-32 resize-none text-white font-mono text-sm"
                    placeholder="Nhập nội dung đề bài (Hỗ trợ công thức Toán/Lý/Hóa kẹp giữa $...$ hoặc $$...$$)..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Điểm tối đa</label>
                  <input 
                    type="number"
                    value={maxScore}
                    onChange={e => setMaxScore(e.target.value)}
                    className="glass-input w-32 p-3 rounded-xl text-white"
                    min="0"
                    step="0.5"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                  <button onClick={() => setIsAddingQuestion(false)} className="px-5 py-2 rounded-xl text-slate-400 hover:text-white transition-colors font-medium">
                    Hủy
                  </button>
                  <button 
                    onClick={() => addQuestionMutation.mutate({
                      assignmentId,
                      type: QuestionType.SHORT_ESSAY,
                      content,
                      maxScore: parseFloat(maxScore),
                      orderIndex: assignment.questions.length
                    })}
                    disabled={!content || addQuestionMutation.isPending}
                    className="bg-brand-accent hover:bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    Lưu câu hỏi
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => setIsAddingQuestion(true)}
                className="w-full glass-panel border-2 border-dashed border-slate-600 hover:border-brand-accent/50 text-slate-400 hover:text-white p-8 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all group"
              >
                <div className="p-4 bg-white/5 group-hover:bg-brand-accent/20 rounded-full transition-colors">
                  <Plus className="w-8 h-8 group-hover:text-brand-accent" />
                </div>
                <span className="font-bold text-lg">Thêm câu hỏi thủ công</span>
                <span className="text-sm opacity-70">Tự nhập nội dung và thiết lập điểm số</span>
              </button>
              
              <div className="w-full glass-panel border-2 border-dashed border-slate-600 hover:border-emerald-500/50 text-slate-400 hover:text-white p-8 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all group relative">
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  disabled={isUploading}
                  title="Tải lên ảnh hoặc PDF đề thi"
                />
                <div className="p-4 bg-white/5 group-hover:bg-emerald-500/20 rounded-full transition-colors">
                  {isUploading ? (
                    <Clock className="w-8 h-8 group-hover:text-emerald-500 animate-spin" />
                  ) : (
                    <BrainCircuit className="w-8 h-8 group-hover:text-emerald-500" />
                  )}
                </div>
                <span className="font-bold text-lg">{isUploading ? "AI Đang xử lý..." : "Tạo tự động bằng AI từ File"}</span>
                <span className="text-sm opacity-70 text-center">Tải lên Ảnh/PDF. AI sẽ bóc tách và tạo câu hỏi tự động.</span>
              </div>
            </div>
          )
        )}
      </div>

      {/* Anti-Cheat Security Report Table */}
      {antiCheatReport && antiCheatReport.length > 0 && (() => {
        const submittedCount = antiCheatReport.filter((r: any) => r.status !== 'IN_PROGRESS' && r.submittedAt).length;
        const inProgressCount = antiCheatReport.length - submittedCount;

        return (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <ShieldAlert className="w-6 h-6 text-amber-400" /> Giám sát Phòng thi & Chống gian lận
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Tổng {antiCheatReport.length} thí sinh ({submittedCount} đã nộp bài{inProgressCount > 0 ? `, ${inProgressCount} đang làm bài` : ''})
                </p>
              </div>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Tự động cập nhật thời gian thực
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Học sinh</th>
                    <th className="py-3 px-4">Trạng thái bài thi</th>
                    <th className="py-3 px-4">Thời gian nộp</th>
                    <th className="py-3 px-4">Số vi phạm</th>
                    <th className="py-3 px-4">Mức độ rủi ro</th>
                    <th className="py-3 px-4">Chi tiết sự kiện</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {antiCheatReport.map((rep: any) => {
                    const isInProgress = rep.status === 'IN_PROGRESS' || !rep.submittedAt;

                    return (
                      <tr key={rep.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          {rep.student.fullName}
                          <span className="block text-xs text-slate-400 font-normal">{rep.student.email}</span>
                        </td>
                        <td className="py-3 px-4">
                          {isInProgress ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                              Đang làm bài (Chưa nộp)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Đã nộp bài
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs">
                          {rep.submittedAt ? (
                            new Date(rep.submittedAt).toLocaleString('vi-VN')
                          ) : (
                            <span className="text-slate-500 italic">Chưa nộp bài</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {rep.violationCount} lần
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1 ${
                            rep.riskLevel === 'HIGH' 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : rep.riskLevel === 'MEDIUM' 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {rep.riskLevel === 'HIGH' && '🔴 Rủi ro Cao'}
                            {rep.riskLevel === 'MEDIUM' && '🟡 Rủi ro Trung bình'}
                            {rep.riskLevel === 'LOW' && '🟢 An toàn'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {rep.antiCheatLog.length === 0 ? (
                            <span className="text-slate-500">Không ghi nhận vi phạm</span>
                          ) : (
                            <div className="space-y-1">
                              {rep.antiCheatLog.map((log: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>{log.event}: {new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isInProgress ? (
                            <span className="text-xs text-slate-500 italic px-3 py-1.5 inline-block">
                              Đang làm bài...
                            </span>
                          ) : (
                            <Link
                              href={`/teacher/submissions/${rep.id}`}
                              className="bg-brand-accent/20 hover:bg-brand-accent text-brand-accent hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-block shadow-sm"
                            >
                              Chấm & Duyệt 2 cột
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
