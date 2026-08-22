import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, BookOpen } from "lucide-react";
import { SignOutButton } from "@/components/shared/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/login");
  }

  const role = (session.user as any).role;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-brand-bg">
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass-panel border-r border-white/5 flex flex-col">
        <div className="p-6">
          <Link href="/dashboard" className="text-2xl font-extrabold tracking-tight">
            EduGrade<span className="text-brand-accent">AI</span>
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-white/10 rounded-full font-medium">
              {role === "TEACHER" ? "Giáo viên" : "Học sinh"}
            </span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link href={`/${role === "TEACHER" ? "teacher" : "student"}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-brand-accent/20 text-brand-accent font-medium border border-brand-accent/30 transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Bảng điều khiển
          </Link>
          <Link href={`/${role === "TEACHER" ? "teacher/classes" : "student/exams"}`} className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <BookOpen className="w-5 h-5" />
            {role === "TEACHER" ? "Lớp học" : "Bài thi"}
          </Link>
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
            <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
