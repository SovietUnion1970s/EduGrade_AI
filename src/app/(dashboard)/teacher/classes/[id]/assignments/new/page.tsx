"use client";

import { trpc } from "@/lib/trpc";
import { ArrowLeft, BrainCircuit, Clock, Type } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { GradingStyle } from "@prisma/client";

export default function CreateAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gradingStyle, setGradingStyle] = useState<GradingStyle>(GradingStyle.THPT_QUOC_GIA);
  const [timeLimit, setTimeLimit] = useState("");

  const createMutation = trpc.assignment.create.useMutation({
    onSuccess: (data) => {
      router.push(`/teacher/assignments/${data.id}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      classId,
      title,
      description: description || undefined,
      gradingStyle,
      timeLimitMinutes: timeLimit ? parseInt(timeLimit) : undefined
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/teacher/classes/${classId}`} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Tạo Đề Thi Mới</h1>
          <p className="text-slate-400">Khởi tạo thông tin cơ bản cho đề thi. Bạn sẽ thêm câu hỏi ở bước sau.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-3xl border border-white/5 space-y-6 shadow-premium">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <Type className="w-4 h-4 text-brand-accent" /> Tên bài thi
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="glass-input w-full px-4 py-3 rounded-xl text-white"
            placeholder="VD: Kiểm tra 15 phút môn Văn..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Mô tả / Lời dặn dò (Tùy chọn)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="glass-input w-full px-4 py-3 rounded-xl text-white h-24 resize-none"
            placeholder="Ghi chú thêm cho học sinh..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-indigo-400" /> Tiêu chuẩn chấm AI
            </label>
            <select
              value={gradingStyle}
              onChange={e => setGradingStyle(e.target.value as GradingStyle)}
              className="glass-input w-full px-4 py-3 rounded-xl text-white appearance-none"
            >
              <option value={GradingStyle.THPT_QUOC_GIA}>Cấu trúc THPT Quốc Gia (Bareme)</option>
              <option value={GradingStyle.SANG_TAO}>Văn sáng tạo / Tiểu luận</option>
              <option value={GradingStyle.CO_BAN}>Chấm cơ bản (Toán/Lý)</option>
              <option value={GradingStyle.CUSTOM}>Chấm tùy chỉnh / Từ khóa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Thời gian làm bài (Phút)
            </label>
            <input
              type="number"
              value={timeLimit}
              onChange={e => setTimeLimit(e.target.value)}
              className="glass-input w-full px-4 py-3 rounded-xl text-white"
              placeholder="Để trống nếu không giới hạn"
              min="1"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button 
            type="submit" 
            disabled={createMutation.isPending || !title}
            className="bg-brand-accent hover:bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {createMutation.isPending ? "Đang tạo..." : "Lưu & Tiếp tục thêm câu hỏi"}
          </button>
        </div>
      </form>
    </div>
  );
}
