import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { TRPCProvider } from "@/components/providers/trpc-provider";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "EduGrade AI - Hệ thống chấm điểm tự luận thông minh",
  description: "Giải pháp chấm điểm tự luận tự động bằng AI, bảo mật đa trường và phản hồi thực tế.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body
        className={`${outfit.variable} font-sans antialiased bg-brand-bg text-slate-100 min-h-screen`}
      >
        <SessionProvider>
          <TRPCProvider>
            {children}
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
