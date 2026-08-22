"use client";

import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle, Plus, BrainCircuit, AlignLeft, ShieldAlert, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { QuestionType } from "@prisma/client";

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
          
          {assignment.status === 'DRAFT' && (
            <button 
              onClick={() => publishMutation.mutate({ id: assignmentId })}
              disabled={assignment.questions.length === 0 || publishMutation.isPending}
              className="flex w-full md:w-auto justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-premium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-5 h-5" /> Công bố đề thi
            </button>
          )}
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
            <div className="text-slate-300 whitespace-pre-wrap leading-relaxed bg-white/5 p-4 rounded-xl">
              {q.content}
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
                  <label className="block text-sm text-slate-400 mb-1">Nội dung câu hỏi</label>
                  <textarea 
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="glass-input w-full p-4 rounded-xl h-32 resize-none text-white"
                    placeholder="Nhập nội dung đề bài (Hỗ trợ xuống dòng)..."
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
            <button 
              onClick={() => setIsAddingQuestion(true)}
              className="w-full glass-panel border-2 border-dashed border-slate-600 hover:border-brand-accent/50 text-slate-400 hover:text-white p-8 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all group"
            >
              <div className="p-4 bg-white/5 group-hover:bg-brand-accent/20 rounded-full transition-colors">
                <Plus className="w-8 h-8 group-hover:text-brand-accent" />
              </div>
              <span className="font-bold text-lg">Thêm câu hỏi tự luận</span>
              <span className="text-sm opacity-70">Nhấn vào đây để thêm nội dung và thiết lập điểm số</span>
            </button>
          )
        )}
      </div>

      {/* Anti-Cheat Security Report Table */}
      {antiCheatReport && antiCheatReport.length > 0 && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <ShieldAlert className="w-6 h-6 text-amber-400" /> Báo cáo Chống gian lận ({antiCheatReport.length} bài nộp)
            </h2>
            <span className="text-xs text-slate-400">Tự động cập nhật thời gian thực</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Học sinh</th>
                  <th className="py-3 px-4">Thời gian nộp</th>
                  <th className="py-3 px-4">Số vi phạm</th>
                  <th className="py-3 px-4">Mức độ rủi ro</th>
                  <th className="py-3 px-4">Chi tiết sự kiện</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {antiCheatReport.map((rep) => (
                  <tr key={rep.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {rep.student.fullName}
                      <span className="block text-xs text-slate-400 font-normal">{rep.student.email}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-xs">
                      {rep.submittedAt ? new Date(rep.submittedAt).toLocaleString('vi-VN') : 'N/A'}
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
                      <Link
                        href={`/teacher/submissions/${rep.id}`}
                        className="bg-brand-accent/20 hover:bg-brand-accent text-brand-accent hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-block"
                      >
                        Chấm & Duyệt 2 cột
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
