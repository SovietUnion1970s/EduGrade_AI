"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Email hoặc mật khẩu không chính xác.");
      setLoading(false);
    } else {
      router.push("/"); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-accent/20 blur-[120px] rounded-full mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-success/10 blur-[120px] rounded-full mix-blend-screen" />
      
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">EduGrade<span className="text-brand-accent">AI</span></h1>
          <p className="text-slate-400">Nền tảng chấm điểm tự luận thông minh</p>
        </div>

        <div className="glass-panel rounded-3xl p-8 sm:p-10 relative z-10">
          <h2 className="text-2xl font-bold mb-6 text-white">Đăng nhập</h2>
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-brand-danger/10 border border-brand-danger/20 flex items-start gap-3 text-brand-danger">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input block w-full pl-11 pr-4 py-3.5 rounded-xl text-sm"
                  placeholder="nhap@truonghoc.edu.vn"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <label className="block text-sm font-medium text-slate-300">Mật khẩu</label>
                <Link href="/auth/forgot-password" className="text-xs font-medium text-brand-accent hover:text-indigo-400 transition-colors">Quên mật khẩu?</Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input block w-full pl-11 pr-4 py-3.5 rounded-xl text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-brand-accent hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-bg focus:ring-brand-accent transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-premium mt-8"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Chưa có tài khoản?{" "}
            <Link href="/auth/register" className="font-semibold text-brand-accent hover:text-indigo-400 transition-colors">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
