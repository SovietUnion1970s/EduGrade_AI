"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Route Error]:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="glass-panel p-8 sm:p-10 rounded-3xl text-center border border-amber-500/30 shadow-2xl space-y-6 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Trang này tạm thời gặp sự cố</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Hệ thống quản lý phiên làm việc vẫn an toàn. Bạn có thể nhấn &quot;Khôi phục & Thử lại&quot; để tải lại trang mà không bị mất đăng nhập.
          </p>
        </div>

        {error?.message && (
          <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 text-left font-mono text-xs text-red-300 overflow-x-auto max-h-28">
            <code>{error.message}</code>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent hover:bg-indigo-600 text-white rounded-xl font-bold text-xs transition-all shadow-md"
          >
            <RefreshCw className="w-4 h-4" /> Khôi phục & Thử lại
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-all border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold text-xs transition-all"
          >
            <Home className="w-4 h-4" /> Về trang chính
          </Link>
        </div>
      </div>
    </div>
  );
}
