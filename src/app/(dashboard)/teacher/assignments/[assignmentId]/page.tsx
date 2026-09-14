"use client";

import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, CheckCircle, Plus, BrainCircuit, AlignLeft, ShieldAlert, 
  AlertTriangle, Clock, Download, Layers, Trash2, Pencil, RefreshCw, X 
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { QuestionType } from "@prisma/client";
import { toast } from "sonner";
import { MathRenderer } from "@/components/shared/math-renderer";
import { MathToolbar } from "@/components/shared/math-toolbar";
import { ExamBlueprintModal } from "@/components/teacher/exam-blueprint-modal";

export default function AssignmentEditorPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;
  const utils = trpc.useUtils();
  const router = useRouter();
  
  const { data: assignment, isLoading } = trpc.assignment.getById.useQuery({ id: assignmentId });
  const { data: antiCheatReport } = trpc.submission.getAntiCheatReport.useQuery({ assignmentId }, { refetchInterval: 3000 });
  
  // Question creation & editing states
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [content, setContent] = useState("");
  const [maxScore, setMaxScore] = useState("10");

  const [editingQuestion, setEditingQuestion] = useState<{
    id: string;
    content: string;
    maxScore: string;
  } | null>(null);

  // Blueprint modal state
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);

  // Upload modal & process states
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [showUploadModeModal, setShowUploadModeModal] = useState(false);
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

  // Trigger when a file is selected
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (assignment && assignment.questions.length > 0) {
      // If assignment already has questions, ask teacher whether to replace or append
      setPendingUploadFile(file);
      setShowUploadModeModal(true);
    } else {
      // If empty assignment, directly replace/create
      executeUpload(file, 'replace');
    }
  };

  // Perform upload to server
  const executeUpload = async (file: File, mode: 'replace' | 'append') => {
    setIsUploading(true);
    setShowUploadModeModal(false);
    setPendingUploadFile(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    try {
      const res = await fetch(`/api/v1/assignments/${assignmentId}/generate-questions`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      
      if (!res.ok) {
        toast.error("Lỗi: " + (result.error?.message || "Không thể xử lý file"));
        if (result.error?.details?.issues) {
          toast.warning("AI cảnh báo: " + result.error.details.issues);
        }
      } else {
        toast.success(`Đã ${mode === 'replace' ? 'thay thế toàn bộ và tạo mới' : 'thêm tiếp'} ${result.data.count} câu hỏi thành công!`);
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
      toast.success("Đã thêm câu hỏi thành công!");
    }
  });

  const updateQuestionMutation = trpc.assignment.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật câu hỏi thành công!");
      utils.assignment.getById.invalidate({ id: assignmentId });
      setEditingQuestion(null);
    },
    onError: (err) => {
      toast.error("Lỗi cập nhật câu hỏi: " + err.message);
    }
  });

  const deleteQuestionMutation = trpc.assignment.deleteQuestion.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa câu hỏi.");
      utils.assignment.getById.invalidate({ id: assignmentId });
    },
    onError: (err) => {
      toast.error("Lỗi xóa câu hỏi: " + err.message);
    }
  });

  const clearAllQuestionsMutation = trpc.assignment.clearAllQuestions.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa toàn bộ câu hỏi để quét lại đề.");
      utils.assignment.getById.invalidate({ id: assignmentId });
    },
    onError: (err) => {
      toast.error("Lỗi: " + err.message);
    }
  });

  const publishMutation = trpc.assignment.publish.useMutation({
    onSuccess: () => {
      utils.assignment.getById.invalidate({ id: assignmentId });
      toast.success("Đã công bố đề thi thành công!");
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
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`px-3 py-1 rounded-full font-bold text-xs ${assignment.status === 'DRAFT' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                {assignment.status === 'DRAFT' ? 'Đang soạn thảo' : 'Đã công bố'}
              </span>
              <span className="text-slate-400 text-xs flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400"/> {assignment.gradingStyle}
              </span>
              {assignment.aiGradingInstruction ? (
                <span className="text-xs flex items-center gap-1 bg-brand-accent/20 text-brand-accent px-2.5 py-1 rounded-full border border-brand-accent/30 font-medium">
                  <Layers className="w-3.5 h-3.5"/> Blueprint Đề Thi Đã Thiết Lập
                </span>
              ) : (
                <span className="text-xs flex items-center gap-1 bg-white/5 text-slate-400 px-2.5 py-1 rounded-full border border-white/5">
                  Chưa cấu hình Blueprint riêng
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Nút Cấu trúc Đề & AI Blueprint */}
            <button
              onClick={() => setIsBlueprintModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-4 py-3 rounded-xl font-bold shadow-sm transition-all text-sm"
              title="Cài đặt ma trận đề thi hoặc cho AI học từ đề cũ"
            >
              <Layers className="w-4 h-4 text-indigo-400" /> Cấu trúc Đề & Blueprint
            </button>

            {/* Chỉ hiển thị Xuất Excel khi đề ĐÃ CÔNG BỐ (hoặc ĐÃ ĐÓNG) - KHÔNG hiển thị khi Đang soạn thảo */}
            {assignment.status !== 'DRAFT' && (
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg transition-all text-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isExporting ? "Đang tạo..." : "Xuất Bảng Điểm (.xlsx)"}
              </button>
            )}

            {assignment.status === 'DRAFT' && (
              <button 
                onClick={() => publishMutation.mutate({ id: assignmentId })}
                disabled={assignment.questions.length === 0 || publishMutation.isPending}
                className="flex items-center justify-center gap-2 bg-brand-accent hover:bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold shadow-premium transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" /> Công bố đề thi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <AlignLeft className="w-5 h-5 text-brand-accent" /> Danh sách câu hỏi ({assignment.questions.length})
          </h2>

          {assignment.status === 'DRAFT' && assignment.questions.length > 0 && (
            <button
              onClick={() => {
                if (confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${assignment.questions.length} câu hỏi để quét lại từ đầu không?`)) {
                  clearAllQuestionsMutation.mutate({ assignmentId });
                }
              }}
              disabled={clearAllQuestionsMutation.isPending}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả để quét lại
            </button>
          )}
        </div>
        
        {assignment.questions.map((q, index) => {
          const isEditing = editingQuestion?.id === q.id;

          if (isEditing) {
            return (
              <div key={q.id} className="glass-panel p-6 rounded-2xl border border-indigo-500/40 bg-indigo-500/5 space-y-4 shadow-premium">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2 text-base">
                    <Pencil className="w-4 h-4 text-indigo-400" /> Chỉnh sửa Câu {index + 1}
                  </h3>
                  <button 
                    onClick={() => setEditingQuestion(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <MathToolbar
                    label="Soạn thảo Đề bài & Công thức Toán KaTeX"
                    currentValue={editingQuestion.content}
                    onInsert={(snippet) => setEditingQuestion(prev => prev ? ({ ...prev, content: prev.content + snippet }) : null)}
                  />
                  <textarea
                    value={editingQuestion.content}
                    onChange={(e) => setEditingQuestion(prev => prev ? ({ ...prev, content: e.target.value }) : null)}
                    className="glass-input w-full p-4 rounded-xl h-36 resize-y text-white font-mono text-sm"
                    placeholder="Nhập nội dung câu hỏi (sử dụng $...$ hoặc $$...$$ cho công thức toán)..."
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-300">Điểm tối đa:</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={editingQuestion.maxScore}
                      onChange={(e) => setEditingQuestion(prev => prev ? ({ ...prev, maxScore: e.target.value }) : null)}
                      className="glass-input w-24 px-3 py-1.5 rounded-lg text-white font-mono text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingQuestion(null)}
                      className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={() => updateQuestionMutation.mutate({
                        questionId: q.id,
                        content: editingQuestion.content,
                        maxScore: parseFloat(editingQuestion.maxScore) || 2
                      })}
                      disabled={updateQuestionMutation.isPending || !editingQuestion.content.trim()}
                      className="bg-brand-accent hover:bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                    >
                      {updateQuestionMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={q.id} className="glass-panel p-6 rounded-2xl border border-white/5 relative group">
              <div className="flex items-center gap-1.5 absolute top-0 right-0">
                {assignment.status === 'DRAFT' && (
                  <>
                    <button
                      onClick={() => setEditingQuestion({
                        id: q.id,
                        content: q.content,
                        maxScore: String(q.maxScore)
                      })}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors mt-2"
                      title="Sửa nội dung câu hỏi này"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa Câu ${index + 1}?`)) {
                          deleteQuestionMutation.mutate({ questionId: q.id });
                        }
                      }}
                      disabled={deleteQuestionMutation.isPending}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors mt-2 mr-2"
                      title="Xóa câu hỏi này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <div className="bg-brand-accent/20 px-4 py-1.5 rounded-bl-xl rounded-tr-2xl text-sm font-bold text-brand-accent">
                  {Number(q.maxScore)} điểm
                </div>
              </div>

              <h3 className="font-bold text-lg mb-3 text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-accent/20 text-brand-accent flex items-center justify-center text-xs font-black">
                  {index + 1}
                </span>
                Câu {index + 1}
                <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-400 font-normal">
                  {q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm 4 lựa chọn' : q.type === 'FILL_BLANK' ? 'Điền đáp số' : 'Tự luận / Đa ý'}
                </span>
              </h3>

              <div className="text-slate-300 leading-relaxed bg-white/5 p-4 rounded-xl space-y-3">
                <MathRenderer content={q.content} />

                {/* Hiển thị 4 lựa chọn nếu là trắc nghiệm */}
                {Array.isArray(q.choices) && (q.choices as any[]).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(q.choices as any[]).map((c: any) => (
                      <div 
                        key={c.id} 
                        className={`p-2.5 rounded-xl border text-sm flex items-start gap-2 ${
                          c.id === q.correctAnswer 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                            : 'bg-white/[0.03] border-white/5 text-slate-300'
                        }`}
                      >
                        <span className="w-5 h-5 rounded bg-white/10 font-bold flex items-center justify-center text-xs shrink-0 text-brand-accent">
                          {c.id}
                        </span>
                        <MathRenderer content={c.text} className="inline" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Rubric Bareme */}
                {q.rubricItems && q.rubricItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-400 space-y-1">
                    <span className="font-bold text-slate-300">Tiêu chí chấm điểm (Bareme):</span>
                    {q.rubricItems.map((r, rIdx) => (
                      <div key={r.id || rIdx} className="flex items-center justify-between py-1 px-2 rounded bg-white/[0.02]">
                        <span className="text-slate-300">• {r.description}</span>
                        <span className="font-mono font-bold text-brand-accent">{Number(r.score)} điểm</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

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
                  onChange={handleFileInputChange}
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
                <span className="font-bold text-lg">{isUploading ? "AI Đang xử lý theo Blueprint..." : "Tạo tự động bằng AI từ File"}</span>
                <span className="text-sm opacity-70 text-center">Bóc tách theo đúng Blueprint và chuẩn hóa LaTeX KaTeX</span>
              </div>
            </div>
          )
        )}
      </div>

      {/* MODAL LỰA CHỌN CHẾ ĐỘ QUÉT: GHI ĐÈ HAY NỐI TIẾP */}
      {showUploadModeModal && pendingUploadFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-950 text-white space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Chọn Chế Độ Tạo Câu Hỏi</h3>
                  <p className="text-xs text-slate-400">Đề thi hiện đã có {assignment.questions.length} câu hỏi</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadModeModal(false);
                  setPendingUploadFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              File bạn chọn: <strong className="text-white font-mono text-xs">{pendingUploadFile.name}</strong>.<br />
              Bạn muốn AI xử lý thế nào với các câu hỏi cũ?
            </p>

            <div className="space-y-3">
              {/* Option 1: Replace / Overwrite */}
              <button
                onClick={() => executeUpload(pendingUploadFile, 'replace')}
                className="w-full p-4 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-left transition-all group flex items-start gap-3"
              >
                <RefreshCw className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0 group-hover:rotate-180 transition-transform duration-500" />
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    Ghi đè & Thay thế toàn bộ đề cũ
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-300 font-bold">Khuyên dùng</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Xóa sạch {assignment.questions.length} câu hỏi cũ và nạp bộ câu hỏi mới từ file này.
                  </div>
                </div>
              </button>

              {/* Option 2: Append */}
              <button
                onClick={() => executeUpload(pendingUploadFile, 'append')}
                className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-left transition-all flex items-start gap-3"
              >
                <Plus className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold text-white text-sm">Thêm tiếp vào sau</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Giữ nguyên {assignment.questions.length} câu hỏi hiện tại và thêm các câu mới vào cuối đề.
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                setShowUploadModeModal(false);
                setPendingUploadFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

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
                            <span className="text-slate-500">Chưa ghi nhận</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            rep.violationCount === 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                          }`}>
                            {rep.violationCount} lần
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {rep.riskLevel === 'high' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                              Cao (Nguy cơ)
                            </span>
                          )}
                          {rep.riskLevel === 'medium' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Trung bình
                            </span>
                          )}
                          {rep.riskLevel === 'low' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              An toàn
                            </span>
                          )}
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

      {/* Modal Quản lý Cấu trúc Đề thi & Blueprint */}
      <ExamBlueprintModal
        isOpen={isBlueprintModalOpen}
        onClose={() => setIsBlueprintModalOpen(false)}
        assignmentId={assignmentId}
        currentInstruction={assignment.aiGradingInstruction}
        currentGradingStyle={assignment.gradingStyle}
      />
    </div>
  );
}
