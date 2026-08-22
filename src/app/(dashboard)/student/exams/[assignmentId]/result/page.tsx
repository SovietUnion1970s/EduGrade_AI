"use client";

import { trpc } from "@/lib/trpc";
import { ArrowLeft, Clock, Bot, FileText, ArrowRight, ShieldCheck, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function SubmissionResultPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;
  
  const { data: submission, isLoading } = trpc.submission.getById.useQuery({ id: submissionId }, { refetchInterval: query => query.state.data?.status === 'GRADING' ? 3000 : false });
  
  if (isLoading) return <div className="text-slate-400 text-center py-20">Đang tải dữ liệu...</div>;
  if (!submission) return <div className="text-brand-danger text-center py-20">Không tìm thấy bài nộp.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 glass-panel p-6 rounded-3xl border-white/5">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white mb-1">Kết quả bài làm</h1>
            <p className="text-slate-400 text-sm font-medium">{submission.assignment.title} • Lớp: {submission.assignment.class.name}</p>
          </div>
        </div>

        {submission.status === 'GRADING' && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-6 py-3 rounded-2xl font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Clock className="w-5 h-5 animate-pulse" /> EduGrade AI đang chấm...
          </div>
        )}
        
        {submission.status !== 'GRADING' && submission.grade && (
          <div className="flex items-center gap-4 bg-gradient-to-br from-brand-accent/20 to-indigo-900/40 border border-brand-accent/40 px-8 py-4 rounded-2xl shadow-[0_0_25px_rgba(99,102,241,0.2)]">
            <div className="text-right">
              <p className="text-xs text-brand-accent font-bold uppercase tracking-widest mb-1 opacity-80">Tổng điểm AI</p>
              <p className="text-4xl font-black text-white leading-none tracking-tight">
                {Number(submission.grade.totalScore).toFixed(1)} <span className="text-xl text-brand-accent/60 font-medium">/ 10</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {submission.status === 'GRADING' ? (
        <div className="glass-panel p-20 rounded-3xl text-center border border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-brand-accent/5 animate-pulse"></div>
          <Bot className="w-24 h-24 text-brand-accent mx-auto mb-8 animate-bounce relative z-10" />
          <h2 className="text-3xl font-extrabold text-white mb-4 relative z-10">AI Đang Đọc & Phân Tích...</h2>
          <p className="text-slate-400 max-w-lg mx-auto text-lg relative z-10">
            Vui lòng chờ trong khoảng 15-30 giây. Hệ thống đang trích xuất ngữ nghĩa và đối chiếu sâu với Rubric của giáo viên để đưa ra kết quả công tâm nhất.
          </p>
        </div>
      ) : submission.grade ? (
        <div className="space-y-8">
          {/* Nhận xét chung */}
          <div className="glass-panel p-8 rounded-3xl border border-brand-accent/20 bg-gradient-to-r from-brand-accent/10 to-transparent relative overflow-hidden">
            <ShieldCheck className="absolute -right-10 -bottom-10 w-48 h-48 text-brand-accent/5" />
            <h3 className="font-extrabold text-lg flex items-center gap-2 text-white mb-4 relative z-10">
              <Bot className="w-6 h-6 text-brand-accent" /> Đánh giá tổng quan từ AI:
            </h3>
            <p className="text-slate-200 leading-relaxed text-lg relative z-10 font-medium">
              {submission.grade.aiOverallComment}
            </p>
          </div>

          {/* Chi tiết từng câu */}
          <div>
            <h3 className="text-2xl font-extrabold mt-10 mb-6 text-white flex items-center gap-3">
              <FileText className="w-6 h-6 text-emerald-400" /> Bảng điểm chi tiết
            </h3>
            
            <div className="space-y-6">
              {submission.answers.map((ans, idx) => {
                const breakdown = submission.grade?.breakdowns.find(b => b.questionId === ans.questionId);
                
                return (
                  <div key={ans.id} className="glass-panel rounded-3xl overflow-hidden border border-white/5 shadow-lg">
                    {/* Header câu */}
                    <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="font-bold text-white text-lg">Câu {idx + 1}</h4>
                        <p className="text-sm text-slate-400 line-clamp-1 mt-1">{ans.question.content}</p>
                      </div>
                      <div className="font-black text-xl text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-xl border border-emerald-400/20 whitespace-nowrap">
                        {Number(breakdown?.scoreAwarded || 0).toFixed(1)} <span className="text-sm font-medium text-emerald-400/60">/ {Number(ans.question.maxScore)} đ</span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
                      {/* Cột bài làm */}
                      <div className="p-6 lg:p-8 space-y-4 bg-black/20">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
                          <ArrowRight className="w-4 h-4" /> Bài làm của bạn
                        </p>
                        <div className="text-slate-300 whitespace-pre-wrap text-base font-mono leading-relaxed">
                          {ans.answerText || <em className="text-slate-600">Bạn đã bỏ trống câu này.</em>}
                        </div>
                      </div>
                      
                      {/* Cột AI chấm */}
                      <div className="p-6 lg:p-8 space-y-4 bg-brand-accent/5">
                        <p className="text-xs text-brand-accent font-bold uppercase tracking-wider flex items-center gap-2">
                          <Bot className="w-4 h-4" /> Phân tích & Góp ý từ AI
                        </p>
                        <p className="text-base text-slate-200 leading-relaxed font-medium">
                          {breakdown?.aiReasoning}
                        </p>
                        
                        {/* Chi tiết rubric items hit */}
                        {breakdown?.rubricItem && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-xs text-slate-500 font-semibold mb-2">Tiêu chí được ghi nhận:</p>
                            <p className="text-sm text-emerald-400 flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                              {breakdown.rubricItem.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 text-center text-brand-danger font-bold text-lg">Đã xảy ra lỗi hệ thống trong quá trình chấm điểm. Vui lòng liên hệ Giáo viên.</div>
      )}
    </div>
  );
}
