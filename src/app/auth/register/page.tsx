"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Briefcase, GraduationCap, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "TEACHER" as "TEACHER" | "STUDENT",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Đăng ký thất bại, vui lòng thử lại.");
      }

      router.push("/auth/login?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-accent/20 blur-[120px] rounded-full mix-blend-screen" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-success/10 blur-[120px] rounded-full mix-blend-screen" />
      
      <div className="w-full max-w-md my-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Tạo tài khoản mới</h1>
          <p className="text-slate-400">Gia nhập nền tảng giáo dục EduGrade AI</p>
        </div>

        <div className="glass-panel rounded-3xl p-8 sm:p-10 relative z-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-brand-danger/10 border border-brand-danger/20 flex items-start gap-3 text-brand-danger">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Phân vùng vai trò (Role Selector) */}
            <div className="flex gap-3 mb-6">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "TEACHER" })}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  formData.role === "TEACHER" 
                    ? "bg-brand-accent/20 border-brand-accent text-white" 
                    : "glass-input text-slate-400 hover:text-slate-200"
                }`}
              >
                <Briefcase className="w-6 h-6" />
                <span className="text-sm font-semibold">Giáo viên</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "STUDENT" })}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  formData.role === "STUDENT" 
                    ? "bg-brand-accent/20 border-brand-accent text-white" 
                    : "glass-input text-slate-400 hover:text-slate-200"
                }`}
              >
                <GraduationCap className="w-6 h-6" />
                <span className="text-sm font-semibold">Học sinh</span>
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Họ và tên</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="glass-input block w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="glass-input block w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                  placeholder="nhap@truonghoc.edu.vn"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="glass-input block w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-brand-accent hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-bg focus:ring-brand-accent transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-premium mt-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Đăng ký tài khoản
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Đã có tài khoản?{" "}
            <Link href="/auth/login" className="font-semibold text-brand-accent hover:text-indigo-400 transition-colors">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
