"use client";

import { trpc } from "@/lib/trpc";
import { Plus, Users, Settings, FileText, ArrowLeft, MoreVertical, UserMinus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ClassDetailsPage() {
  const params = useParams();
  const classId = params.id as string;
  const utils = trpc.useUtils();
  
  const { data: classData, isLoading: isLoadingClass } = trpc.class.getById.useQuery({ id: classId }, { refetchInterval: 3000 });
  const { data: assignments, isLoading: isLoadingAssignments } = trpc.assignment.getAllByClass.useQuery({ classId });

  const removeStudentMutation = trpc.class.removeStudent.useMutation({
    onSuccess: () => {
      utils.class.getById.invalidate({ id: classId });
      utils.class.getAll.invalidate();
      alert("Đã xóa học sinh khỏi lớp!");
    },
    onError: (err) => alert("Lỗi: " + err.message)
  });

  if (isLoadingClass) return <div className="text-slate-400">Đang tải thông tin lớp...</div>;
  if (!classData) return <div className="text-brand-danger">Không tìm thấy lớp học.</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/teacher" className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-white">{classData.name}</h1>
            <p className="text-slate-400">{classData.subject} • Khối {classData.gradeLevel} • Mã: <span className="font-mono text-brand-accent">{classData.joinCode}</span></p>
          </div>
        </div>
        <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Assignments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
              <FileText className="w-6 h-6 text-brand-accent" /> Đề thi & Bài tập
            </h2>
            <Link 
              href={`/teacher/classes/${classId}/assignments/new`}
              className="flex items-center gap-2 bg-brand-accent hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-premium"
            >
              <Plus className="w-4 h-4" /> Tạo đề mới
            </Link>
          </div>

          {isLoadingAssignments ? (
            <p className="text-slate-400">Đang tải danh sách bài tập...</p>
          ) : assignments?.length === 0 ? (
            <div className="glass-panel p-10 rounded-3xl text-center border border-white/5 border-dashed">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-1">Chưa có đề thi nào</h3>
              <p className="text-sm text-slate-400">Nhấn nút tạo đề mới để bắt đầu giao bài cho học sinh.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments?.map(a => (
                <div key={a.id} className="glass-panel p-5 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-brand-accent/50 transition-colors">
                  <div>
                    <Link href={`/teacher/assignments/${a.id}`} className="text-lg font-bold text-white hover:text-brand-accent transition-colors block mb-1">
                      {a.title}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${a.status === 'DRAFT' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                        {a.status === 'DRAFT' ? 'Bản nháp' : 'Đã công bố'}
                      </span>
                      <span>{a.questions.length} câu hỏi</span>
                      <span>•</span>
                      <span>{a.timeLimitMinutes || 'Không giới hạn'} phút</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-0.5">Đã nộp</p>
                      <p className="font-semibold text-white">{a.submissions.length} / {classData.memberships.length}</p>
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Students */}
        <div>
          <div className="glass-panel p-6 rounded-3xl border border-white/5 sticky top-8">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-white">
              <Users className="w-5 h-5 text-emerald-500" /> Sĩ số ({classData.memberships.length})
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {classData.memberships.map(m => (
                <div key={m.student.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-xs text-white shadow-lg shrink-0">
                      {m.student.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-white truncate">{m.student.fullName}</p>
                      <p className="text-xs text-slate-400 truncate">{m.student.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc chắn muốn kích học sinh "${m.student.fullName}" ra khỏi lớp không?`)) {
                        removeStudentMutation.mutate({ classId, studentId: m.student.id });
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                    title="Kích khỏi lớp"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {classData.memberships.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Chưa có học sinh nào tham gia lớp này.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
