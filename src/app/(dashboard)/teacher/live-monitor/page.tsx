"use client";

import { trpc } from "@/lib/trpc";
import { Activity, ShieldAlert, UserX, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function LiveMonitorPage() {
  const { data: activeExams, isLoading } = trpc.submission.getActiveExams.useQuery(undefined, { refetchInterval: 3000 });
  const forceSubmitMutation = trpc.submission.forceSubmit.useMutation();
  const utils = trpc.useUtils();

  const handleForceSubmit = (submissionId: string) => {
    if (confirm("Bạn có chắc chắn muốn thu bài của học sinh này ngay lập tức?")) {
      forceSubmitMutation.mutate({ submissionId }, {
        onSuccess: () => {
          utils.submission.getActiveExams.invalidate();
          alert("Đã thu bài thành công!");
        }
      });
    }
  };

  if (isLoading) {
    return <div className="p-20 text-center text-slate-400 flex items-center justify-center gap-2">
      <Activity className="w-5 h-5 animate-pulse" /> Đang kết nối tín hiệu phòng thi...
    </div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="glass-panel p-6 rounded-3xl border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/30">
            <Activity className="w-6 h-6 text-red-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white mb-1">Giám sát Phòng thi Trực tuyến</h1>
            <p className="text-sm text-slate-400">Theo dõi trạng thái làm bài và gian lận của học sinh theo thời gian thực (Cập nhật 3s/lần).</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 font-bold uppercase mb-1">Học sinh đang thi</p>
          <p className="text-3xl font-black text-white">{activeExams?.length || 0}</p>
        </div>
      </div>

      {!activeExams || activeExams.length === 0 ? (
        <div className="glass-panel p-16 rounded-3xl text-center border-white/5">
          <CheckCircle2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Phòng thi đang trống</h3>
          <p className="text-slate-400">Hiện không có học sinh nào đang làm bài thi trực tuyến.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeExams.map((sub) => {
            const logs = (sub.antiCheatLog as any[]) || [];
            const violationCount = logs.length;
            const startedAt = new Date(sub.startedAt);
            const durationMins = Math.floor((Date.now() - startedAt.getTime()) / 60000);

            return (
              <div key={sub.id} className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between">
                {violationCount >= 3 && (
                  <div className="absolute top-0 right-0 left-0 h-1 bg-red-500 animate-pulse"></div>
                )}
                
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-white text-lg">{sub.student.fullName}</h3>
                      <p className="text-xs text-slate-400">{sub.student.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Thời gian làm</span>
                      <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {durationMins} phút
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-300 mb-3 bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <span className="text-slate-500">Đang thi: </span> 
                    <strong className="text-white">{sub.assignment.title}</strong> 
                    <span className="text-xs text-brand-accent ml-2">({sub.assignment.class.name})</span>
                  </div>

                  <div className={`p-3 rounded-xl border ${violationCount === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : violationCount < 3 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <p className="text-xs font-bold mb-2 flex items-center gap-2">
                      <ShieldAlert className={`w-4 h-4 ${violationCount === 0 ? 'text-emerald-400' : violationCount < 3 ? 'text-amber-400' : 'text-red-400'}`} />
                      <span className={violationCount === 0 ? 'text-emerald-400' : violationCount < 3 ? 'text-amber-400' : 'text-red-400'}>
                        Cảnh báo Gian lận: {violationCount} lần
                      </span>
                    </p>
                    {violationCount > 0 && (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto pr-2">
                        {logs.slice().reverse().map((log, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] text-red-300/80">
                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>{log.reason || log.event} ({new Date(log.timestamp).toLocaleTimeString('vi-VN')})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleForceSubmit(sub.id)}
                    disabled={forceSubmitMutation.isPending}
                    className="flex-1 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white py-2 rounded-xl text-xs font-bold transition-all border border-red-500/30 flex items-center justify-center gap-2"
                  >
                    <UserX className="w-4 h-4" /> Đình chỉ & Thu bài
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
