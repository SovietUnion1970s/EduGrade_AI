"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/auth/login" })}
      className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-brand-danger hover:bg-brand-danger/10 transition-colors text-sm font-medium"
    >
      <LogOut className="w-4 h-4" />
      Đăng xuất
    </button>
  );
}
