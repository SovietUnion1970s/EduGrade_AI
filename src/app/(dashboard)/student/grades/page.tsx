"use client";

import { trpc } from "@/lib/trpc";
import { BookOpen, Calendar, ChevronRight, FileText, GraduationCap, Award, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function StudentGradesPage() {
  const { data: submissions, isLoading } = trpc.submission.getMyGrades.useQuery();

  // Bảng điểm cần có tính toán tổng hợp (Summary)
  const stats = useMemo(() => {
    if (!submissions || submissions.length === 0) return { total: 0, graded: 0, avg: 0 };
    
    let gradedCount = 0;
    let totalScore = 0;
    
    submissions.forEach(sub => {
      if (sub.grade && sub.grade.status === 'APPROVED') {
        gradedCount++;
        totalScore += Number(sub.grade.totalScore || 0);
      }
    });

    return {
      total: submissions.length,
      graded: gradedCount,
      avg: gradedCount > 0 ? (totalScore / gradedCount).toFixed(2) : 0
    };
  }, [submissions]);

  if (isLoading) {
    return <div className="p-20 text-center text-slate-400">Đang tải bảng điểm...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Tiêu đề */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border-white/5 relative overflow-hidden bg-gradient-to-r from-brand-accent/20 to-transparent">
        <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3 relative z-10">
          <GraduationCap className="w-8 h-8 text-brand-accent" /> Bảng điểm Tổng hợp
        </h1>
        <p className="text-slate-300 relative z-10 font-medium">Theo dõi chi tiết kết quả học tập, điểm số trung bình và tiến độ hoàn thành các bài thi.</p>
      </div>

      {!submissions || submissions.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border-white/5">
          <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-white">Chưa có dữ liệu</h3>
          <p className="text-slate-400">Bạn chưa nộp bài thi nào trên hệ thống.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Dashboard Thống kê */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="p-4 bg-blue-500/10 text-blue-400 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng số bài nộp</p>
                <p className="text-2xl font-black text-white">{stats.total}</p>
              </div>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Đã có điểm</p>
                <p className="text-2xl font-black text-white">{stats.graded}</p>
              </div>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-brand-accent/20 bg-brand-accent/5 flex items-center gap-4 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
              <div className="p-4 bg-brand-accent/20 text-brand-accent rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-brand-accent font-bold uppercase tracking-wider">Điểm Trung Bình</p>
                <p className="text-3xl font-black text-white">{stats.avg} <span className="text-sm font-medium text-slate-400">/ 10</span></p>
              </div>
            </div>
          </div>

          {/* Bảng điểm chi tiết kiểu Đại học */}
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden shadow-lg">
            <div className="p-6 border-b border-white/5 bg-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" /> Chi tiết kết quả học tập
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/40 text-xs uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6 font-bold border-b border-white/5">Môn học</th>
                    <th className="py-4 px-6 font-bold border-b border-white/5">Tên đề thi</th>
                    <th className="py-4 px-6 font-bold border-b border-white/5">Ngày nộp</th>
                    <th className="py-4 px-6 font-bold border-b border-white/5">Trạng thái</th>
                    <th className="py-4 px-6 font-bold border-b border-white/5 text-right">Điểm số</th>
                    <th className="py-4 px-6 font-bold border-b border-white/5 text-center">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {submissions.map((sub) => {
                    const isGraded = sub.grade && sub.grade.status === 'APPROVED';
                    return (
                      <tr key={sub.id} className="hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-6 font-semibold text-slate-300">
                          {sub.assignment.class.subject || "Khác"}
                          <span className="block text-[11px] text-slate-500 font-normal">{sub.assignment.class.name}</span>
                        </td>
                        <td className="py-4 px-6 text-white font-medium">
                          {sub.assignment.title}
                        </td>
                        <td className="py-4 px-6 text-slate-400 text-xs">
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('vi-VN') : '---'}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                            isGraded ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            sub.status === 'GRADING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {isGraded ? 'Đã có điểm' : sub.status === 'GRADING' ? 'Đang chấm' : 'Chờ chấm'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {isGraded ? (
                            <span className="text-xl font-black text-emerald-400">{Number(sub.grade?.totalScore).toFixed(1)}</span>
                          ) : (
                            <span className="text-sm font-semibold text-slate-500">--</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <Link 
                            href={`/student/submissions/${sub.id}`}
                            className="inline-flex p-2 bg-brand-accent/10 hover:bg-brand-accent text-brand-accent hover:text-white rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
