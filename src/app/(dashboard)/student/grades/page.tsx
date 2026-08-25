"use client";

import { trpc } from "@/lib/trpc";
import { BookOpen, Calendar, ChevronRight, FileText, GraduationCap, Award } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function StudentGradesPage() {
  const { data: submissions, isLoading } = trpc.submission.getMyGrades.useQuery();

  const groupedBySubject = useMemo(() => {
    if (!submissions) return {};
    return submissions.reduce((acc, sub) => {
      const subject = sub.assignment.class.subject || "Khác";
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(sub);
      return acc;
    }, {} as Record<string, typeof submissions>);
  }, [submissions]);

  if (isLoading) {
    return <div className="p-20 text-center text-slate-400">Đang tải bảng điểm...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3 relative z-10">
          <GraduationCap className="w-8 h-8 text-brand-accent" /> Bảng điểm & Học tập
        </h1>
        <p className="text-slate-400 relative z-10">Theo dõi kết quả các bài thi đã làm, điểm số và phản hồi từ giáo viên.</p>
      </div>

      {!submissions || submissions.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border-white/5">
          <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-white">Chưa có dữ liệu</h3>
          <p className="text-slate-400">Bạn chưa nộp bài thi nào trên hệ thống.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedBySubject).map(([subject, subs]) => (
            <div key={subject} className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                <BookOpen className="w-5 h-5 text-indigo-400" /> Môn: {subject}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subs.map((sub) => {
                  const isGraded = sub.grade && sub.grade.status === 'APPROVED';
                  return (
                    <Link 
                      href={`/student/submissions/${sub.id}`} 
                      key={sub.id}
                      className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-brand-accent/50 hover:-translate-y-1 transition-all duration-300 group block relative overflow-hidden"
                    >
                      <div className="mb-3">
                        <h3 className="font-bold text-white text-base leading-tight group-hover:text-brand-accent transition-colors">{sub.assignment.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">{sub.assignment.class.name}</p>
                      </div>
                      
                      <div className="flex items-end justify-between mt-4 pt-4 border-t border-white/10">
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Trạng thái</p>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isGraded ? 'bg-emerald-500/20 text-emerald-400' : 
                            sub.status === 'GRADING' ? 'bg-amber-500/20 text-amber-400' : 
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {isGraded ? 'Đã có điểm' : sub.status === 'GRADING' ? 'Đang chấm' : 'Chưa có điểm'}
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Điểm số</p>
                          {isGraded ? (
                            <p className="text-xl font-black text-emerald-400 flex items-center justify-end gap-1">
                              <Award className="w-4 h-4" /> {Number(sub.grade?.totalScore).toFixed(1)}
                            </p>
                          ) : (
                            <p className="text-sm font-semibold text-slate-400">-- / 10</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
