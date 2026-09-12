"use client";

import { trpc } from "@/lib/trpc";
import { Plus, Users, Settings, FileText, ArrowLeft, MoreVertical, UserMinus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Search, Filter } from "lucide-react";

export default function ClassDetailsPage() {
  const params = useParams();
  const classId = params.id as string;
  const utils = trpc.useUtils();
  
  const { data: classData, isLoading: isLoadingClass } = trpc.class.getById.useQuery({ id: classId }, { refetchInterval: 3000 });
  const { data: assignments, isLoading: isLoadingAssignments } = trpc.assignment.getAllByClass.useQuery({ classId });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredAssignments = assignments?.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm đề thi..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="glass-input appearance-none pl-10 pr-10 py-2.5 rounded-xl text-sm text-white bg-transparent w-full sm:w-auto"
              >
                <option value="ALL" className="bg-slate-900">Tất cả trạng thái</option>
                <option value="PUBLISHED" className="bg-slate-900">Đã công bố</option>
                <option value="DRAFT" className="bg-slate-900">Bản nháp</option>
                <option value="CLOSED" className="bg-slate-900">Đã đóng</option>
                <option value="ARCHIVED" className="bg-slate-900">Lưu trữ</option>
              </select>
            </div>
          </div>

          {isLoadingAssignments ? (
            <p className="text-slate-400">Đang tải danh sách bài tập...</p>
          ) : filteredAssignments?.length === 0 ? (
            <div className="glass-panel p-10 rounded-3xl text-center border border-white/5 border-dashed">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-1">Không tìm thấy bài tập nào</h3>
              <p className="text-sm text-slate-400">Thử thay đổi bộ lọc hoặc tạo đề thi mới.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredAssignments?.map(a => (
                <div key={a.id} className="glass-panel p-5 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-brand-accent/50 transition-colors">
                  <div>
                    <Link href={`/teacher/assignments/${a.id}`} className="text-lg font-bold text-white hover:text-brand-accent transition-colors block mb-1">
                      {a.title}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        a.status === 'DRAFT' ? 'bg-amber-500/20 text-amber-500' : 
                        a.status === 'CLOSED' ? 'bg-red-500/20 text-red-500' :
                        a.status === 'ARCHIVED' ? 'bg-slate-500/20 text-slate-400' :
                        'bg-emerald-500/20 text-emerald-500'
                      }`}>
                        {a.status === 'DRAFT' ? 'Bản nháp' : a.status === 'CLOSED' ? 'Đã đóng' : a.status === 'ARCHIVED' ? 'Lưu trữ' : 'Đã công bố'}
                      </span>
                      <span>{a.questions.length} câu hỏi</span>
                      <span>•</span>
                      <span>{a.timeLimitMinutes || 'Không giới hạn'} phút</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-0.5">Đã nộp</p>
                      {(() => {
                        const subs = (a.submissions as any[]) || [];
                        const submittedCount = subs.filter(s => s.status && s.status !== 'IN_PROGRESS').length;
                        const inProgressCount = subs.filter(s => s.status === 'IN_PROGRESS').length;

                        return (
                          <div>
                            <p className="font-semibold text-white">
                              {submittedCount} / {classData.memberships.length}
                            </p>
                            {inProgressCount > 0 && (
                              <span className="text-[10px] text-amber-400 font-bold block">
                                ({inProgressCount} đang làm)
                              </span>
                            )}
                          </div>
                        );
                      })()}
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
