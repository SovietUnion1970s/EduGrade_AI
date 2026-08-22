"use client";

import { trpc } from "@/lib/trpc";
import { ArrowLeft, BookOpen, Clock, PlayCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function StudentClassDetailsPage() {
  const params = useParams();
  const classId = params.id as string;
  
  const { data: classData, isLoading: isLoadingClass } = trpc.class.getById.useQuery({ id: classId });
  const { data: assignments, isLoading: isLoadingAssignments } = trpc.assignment.getAllByClass.useQuery({ classId });

  if (isLoadingClass) return <div className="text-slate-400">Đang tải thông tin lớp...</div>;
  if (!classData) return <div className="text-brand-danger">Không tìm thấy lớp học.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/student" className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-white">{classData.name}</h1>
          <p className="text-slate-400">Giáo viên: {classData.teacher.fullName} • Môn: {classData.subject}</p>
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 shadow-premium">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-white">
          <BookOpen className="w-6 h-6 text-brand-accent" /> Danh sách Đề thi / Bài tập
        </h2>

        {isLoadingAssignments ? (
          <p className="text-slate-400">Đang tải bài tập...</p>
        ) : assignments?.length === 0 ? (
          <div className="text-center py-10 border border-white/5 border-dashed rounded-2xl bg-white/5">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-1">Chưa có bài tập nào</h3>
            <p className="text-sm text-slate-400">Giáo viên hiện chưa giao bài tập cho lớp này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments?.map((a) => {
              const hasSubmitted = a.submissions && a.submissions.length > 0;

              return (
                <div key={a.id} className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-2">{a.title}</h3>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-4">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {a.timeLimitMinutes ? `${a.timeLimitMinutes} phút` : 'Tự do'}</span>
                      <span className="flex items-center gap-1">Trạng thái: {a.status === 'PUBLISHED' ? 'Đang mở' : 'Đã đóng'}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/5 flex justify-end">
                    {hasSubmitted ? (
                      <Link 
                        href={`/student/submissions/${a.submissions[0].id}`}
                        className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-500 hover:text-white transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Xem kết quả
                      </Link>
                    ) : (
                      <Link 
                        href={`/student/exams/${a.id}`}
                        className="flex items-center gap-2 bg-brand-accent hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold transition-colors"
                      >
                        <PlayCircle className="w-4 h-4" /> Vào thi
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
