"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Next.js Global Error]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white flex items-center justify-center p-6">
      <div className="glass-panel p-8 sm:p-12 rounded-3xl max-w-xl w-full text-center border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] space-y-6 animate-in fade-in">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-10 h-10 animate-bounce" />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Đã xảy ra sự cố không mong muốn</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Hệ thống đã tự động bảo toàn dữ liệu của bạn để ngăn chặn mất thông tin. Bạn có thể nhấn nút thử lại hoặc quay về trang trước mà không cần tải lại toàn bộ web.
          </p>
        </div>

        {error?.message && (
          <div className="p-4 bg-black/40 rounded-xl border border-white/10 text-left font-mono text-xs text-red-300 overflow-x-auto max-h-32">
            <code>{error.message}</code>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-6 py-3 bg-brand-accent hover:bg-indigo-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
          >
            <RefreshCw className="w-4 h-4" /> Khôi phục & Thử lại
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-all border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại trang trước
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold text-sm transition-all"
          >
            <Home className="w-4 h-4" /> Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
