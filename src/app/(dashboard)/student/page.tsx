"use client";

import { trpc } from "@/lib/trpc";
import { LogIn, BookOpen, Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function StudentDashboard() {
  const utils = trpc.useUtils();
  const { data: classes, isLoading } = trpc.class.getAll.useQuery(undefined, { refetchInterval: 3000 });
  
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  
  const joinMutation = trpc.class.join.useMutation({
    onSuccess: () => {
      utils.class.getAll.invalidate();
      setJoinCode("");
      setError("");
      alert("Bạn đã tham gia lớp học thành công!");
    },
    onError: (err) => setError(err.message)
  });

  const leaveMutation = trpc.class.leaveClass.useMutation({
    onSuccess: () => {
      utils.class.getAll.invalidate();
      alert("Bạn đã rời khỏi lớp học.");
    },
    onError: (err) => alert("Lỗi: " + err.message)
  });

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.length !== 6) {
      setError("Mã lớp phải có đúng 6 ký tự.");
      return;
    }
    joinMutation.mutate({ joinCode });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold mb-2 text-white">Bảng điều khiển Học sinh</h1>
        <p className="text-slate-400">Tham gia lớp học và bắt đầu làm bài tập tự luận.</p>
      </div>

      {/* Box Tham gia lớp */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-2xl border border-brand-accent/30 bg-brand-accent/5 shadow-premium">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
          <LogIn className="w-5 h-5 text-brand-accent" /> Tham gia lớp mới
        </h2>
        
        <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 w-full relative">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã 6 ký tự..."
              className="glass-input block w-full px-4 py-3 rounded-xl text-lg font-mono font-bold tracking-[0.25em] text-center sm:text-left text-white"
              maxLength={6}
            />
            {error && <p className="text-brand-danger text-sm mt-2 absolute -bottom-6">{error}</p>}
          </div>
          <button 
            type="submit" 
            disabled={joinMutation.isPending || joinCode.length !== 6}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-accent hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 mt-4 sm:mt-0"
          >
            {joinMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Vào lớp"}
          </button>
        </form>
      </div>

      {/* Lớp của tôi */}
      <div className="pt-4">
        <h2 className="text-2xl font-bold mb-6 text-white">Lớp học của bạn</h2>
        
        {isLoading ? (
          <p className="text-slate-400">Đang tải danh sách lớp...</p>
        ) : classes?.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center max-w-2xl border border-white/5">
            <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-white">Bạn chưa tham gia lớp nào</h3>
            <p className="text-slate-400">Hãy hỏi giáo viên mã lớp (6 ký tự) và nhập vào ô phía trên để tham gia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes?.map((c) => (
              <div key={c.id} className="glass-panel rounded-2xl p-6 border-t-4 border-t-emerald-500 hover:-translate-y-1 transition-transform duration-300">
                <h3 className="text-xl font-bold text-white mb-1">{c.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{c.subject} • Khối {c.gradeLevel}</p>
                
                <div className="p-3 bg-black/20 rounded-xl mb-4 border border-white/5">
                  <p className="text-xs text-slate-400 mb-1">Giáo viên phụ trách</p>
                  <p className="font-medium text-white">{c.teacher.fullName}</p>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-4">
                  <span className="text-xs text-slate-400">Bài tập: <strong className="text-emerald-400">{c.assignments.length}</strong></span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn rời khỏi lớp "${c.name}" không?`)) {
                          leaveMutation.mutate({ classId: c.id });
                        }
                      }}
                      className="text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Rời lớp
                    </button>
                    <Link
                      href={`/student/classes/${c.id}`}
                      className="text-xs bg-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-white px-4 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1"
                    >
                      Vào lớp
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
