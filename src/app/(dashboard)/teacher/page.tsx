"use client";

import { trpc } from "@/lib/trpc";
import { Copy, Plus, Users, BookOpen, BrainCircuit, X, Loader2, Bell, Trash2, UserMinus, ExternalLink } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function TeacherDashboard() {
  const { data: classes, isLoading: isClassesLoading } = trpc.class.getAll.useQuery(undefined, { refetchInterval: 3000 });
  const { data: stats, isLoading: isStatsLoading } = trpc.class.getStats.useQuery(undefined, { refetchInterval: 3000 });
  const { data: notifications } = trpc.notification.list.useQuery({ unreadOnly: true }, { refetchInterval: 3000 });
  const markReadMutation = trpc.notification.markRead.useMutation();
  const utils = trpc.useUtils();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingClassId, setViewingClassId] = useState<string | null>(null);
  const [newClassData, setNewClassData] = useState({ name: "", subject: "", gradeLevel: "10" });

  const { data: selectedClassData } = trpc.class.getById.useQuery(
    { id: viewingClassId || "" },
    { enabled: !!viewingClassId, refetchInterval: 3000 }
  );

  const createClassMutation = trpc.class.create.useMutation({
    onSuccess: () => {
      utils.class.getAll.invalidate();
      utils.class.getStats.invalidate();
      setIsCreateModalOpen(false);
      setNewClassData({ name: "", subject: "", gradeLevel: "10" });
      alert("Tạo lớp thành công!");
    },
    onError: (err) => alert("Lỗi: " + err.message)
  });

  const deleteClassMutation = trpc.class.deleteClass.useMutation({
    onSuccess: () => {
      utils.class.getAll.invalidate();
      utils.class.getStats.invalidate();
      alert("Đã xóa lớp thành công!");
    },
    onError: (err) => alert("Lỗi: " + err.message)
  });

  const removeStudentMutation = trpc.class.removeStudent.useMutation({
    onSuccess: () => {
      utils.class.getAll.invalidate();
      utils.class.getStats.invalidate();
      if (viewingClassId) utils.class.getById.invalidate({ id: viewingClassId });
      alert("Đã kích học sinh khỏi lớp!");
    },
    onError: (err) => alert("Lỗi: " + err.message)
  });

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    createClassMutation.mutate(newClassData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép mã: " + text);
  };

  return (
    <div className="space-y-8">
      {/* Real-time Notifications Banner */}
      {notifications?.items && notifications.items.length > 0 && (
        <div className="space-y-3">
          {notifications.items.map((notif) => (
            <div key={notif.id} className="glass-panel p-4 rounded-2xl border border-brand-accent/40 bg-brand-accent/10 flex items-center justify-between transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-accent/20 rounded-xl text-brand-accent">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{notif.title}</h4>
                  <p className="text-xs text-slate-300">{notif.body}</p>
                </div>
              </div>
              <button
                onClick={() => markReadMutation.mutate({ id: notif.id }, { onSuccess: () => utils.notification.list.invalidate() })}
                className="text-xs font-semibold text-brand-accent hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                Đánh dấu đã đọc
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Header & Stats */}
      <div>
        <h1 className="text-3xl font-extrabold mb-6">Tổng quan</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-brand-accent/20 rounded-xl text-brand-accent"><BookOpen className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Lớp học</p>
              <p className="text-2xl font-bold">{isStatsLoading ? "..." : stats?.classesCount}</p>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-500"><Users className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Học sinh</p>
              <p className="text-2xl font-bold">{isStatsLoading ? "..." : stats?.studentsCount}</p>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400"><BrainCircuit className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-slate-400 font-medium">AI Credits</p>
              <p className="text-2xl font-bold">{isStatsLoading ? "..." : `${stats?.aiCreditsUsed}/${stats?.aiCreditsTotal}`}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Classes List */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Danh sách Lớp học</h2>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-brand-accent hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-premium"
          >
            <Plus className="w-4 h-4" /> Tạo lớp mới
          </button>
        </div>

        {isClassesLoading ? (
          <p className="text-slate-400">Đang tải danh sách...</p>
        ) : classes?.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center border border-white/5">
            <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-white">Chưa có lớp học nào</h3>
            <p className="text-slate-400">Hãy tạo lớp học đầu tiên để bắt đầu giao bài tập cho học sinh.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes?.map((c) => (
              <div key={c.id} className="glass-panel rounded-2xl p-6 relative group overflow-hidden border-t-4 border-t-brand-accent hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Link href={`/teacher/classes/${c.id}`} className="text-xl font-bold text-white mb-1 hover:text-brand-accent transition-colors flex items-center gap-1.5 group/link">
                        {c.name}
                        <ExternalLink className="w-4 h-4 text-slate-500 group-hover/link:text-brand-accent transition-colors" />
                      </Link>
                      <p className="text-sm text-slate-400">{c.subject} • Khối {c.gradeLevel}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn xóa lớp "${c.name}" không?`)) {
                          deleteClassMutation.mutate({ id: c.id });
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Xóa lớp học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-6 mb-6">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Sĩ số</p>
                      <p className="font-semibold text-white">{c.memberships.length} HS</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Bài tập</p>
                      <p className="font-semibold text-white">{c.assignments.length}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setViewingClassId(c.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white border border-white/5 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-400" /> Xem danh sách HS & Kick
                  </button>

                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Mã tham gia</p>
                      <p className="font-mono font-bold tracking-widest text-brand-accent">{c.joinCode}</p>
                    </div>
                    <button onClick={() => copyToClipboard(c.joinCode)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white" title="Copy mã">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl relative">
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-white">Tạo lớp học mới</h2>
            
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tên lớp</label>
                <input 
                  required type="text" placeholder="VD: Lớp 10A1" 
                  value={newClassData.name} onChange={e => setNewClassData({...newClassData, name: e.target.value})}
                  className="glass-input w-full p-3 rounded-xl text-white" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Môn học</label>
                <input 
                  required type="text" placeholder="VD: Ngữ Văn" 
                  value={newClassData.subject} onChange={e => setNewClassData({...newClassData, subject: e.target.value})}
                  className="glass-input w-full p-3 rounded-xl text-white" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Khối lớp</label>
                <select 
                  value={newClassData.gradeLevel} onChange={e => setNewClassData({...newClassData, gradeLevel: e.target.value})}
                  className="glass-input w-full p-3 rounded-xl text-white appearance-none"
                >
                  <option value="10">Khối 10</option><option value="11">Khối 11</option><option value="12">Khối 12</option>
                </select>
              </div>
              <button 
                type="submit" disabled={createClassMutation.isPending}
                className="w-full bg-brand-accent hover:bg-indigo-600 text-white p-3 rounded-xl font-bold mt-6 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {createClassMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Tạo Lớp"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Student List & Kick Modal */}
      {viewingClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl relative border border-white/10 shadow-2xl">
            <button 
              onClick={() => setViewingClassId(null)} 
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-bold mb-1 text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-400" /> Danh sách Học sinh
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              {selectedClassData ? `${selectedClassData.name} • Sĩ số: ${selectedClassData.memberships.length} HS` : "Đang tải..."}
            </p>

            {!selectedClassData ? (
              <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand-accent" /> Đang tải thông tin...
              </div>
            ) : selectedClassData.memberships.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                Lớp này hiện chưa có học sinh nào tham gia.
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {selectedClassData.memberships.map((m) => (
                  <div key={m.student.id} className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-xs text-white shadow-md shrink-0">
                        {m.student.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{m.student.fullName}</p>
                        <p className="text-xs text-slate-400 truncate">{m.student.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn kích học sinh "${m.student.fullName}" khỏi lớp không?`)) {
                          removeStudentMutation.mutate({ classId: selectedClassData.id, studentId: m.student.id });
                        }
                      }}
                      disabled={removeStudentMutation.isPending}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
                    >
                      <UserMinus className="w-3.5 h-3.5" /> Kick
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
