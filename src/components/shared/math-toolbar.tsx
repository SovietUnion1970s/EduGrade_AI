"use client";

import React, { useState } from 'react';
import { MathRenderer } from './math-renderer';
import { Eye, EyeOff, Sparkles, HelpCircle } from 'lucide-react';

interface MathToolbarProps {
  onInsert: (snippet: string) => void;
  currentValue?: string;
  label?: string;
}

export function MathToolbar({ onInsert, currentValue = '', label = 'Soạn thảo Công thức' }: MathToolbarProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const mathButtons = [
    { label: 'a/b', snippet: '\\frac{a}{b}', title: 'Phân số' },
    { label: '√x', snippet: '\\sqrt{x}', title: 'Căn bậc 2' },
    { label: 'x²', snippet: 'x^{2}', title: 'Số mũ' },
    { label: 'x₁', snippet: 'x_{1}', title: 'Chỉ số dưới' },
    { label: '∫', snippet: '\\int_{a}^{b} f(x)dx', title: 'Tích phân' },
    { label: '∑', snippet: '\\sum_{i=1}^{n}', title: 'Tổng sigma' },
    { label: 'lim', snippet: '\\lim_{x \\to x_0}', title: 'Giới hạn' },
    { label: '→', snippet: '\\rightarrow', title: 'Mũi tên phản ứng hóa học' },
    { label: 'Δ', snippet: '\\Delta', title: 'Delta' },
    { label: 'π', snippet: '\\pi', title: 'Số Pi' },
    { label: '≤', snippet: '\\le', title: 'Nhỏ hơn hoặc bằng' },
    { label: '≥', snippet: '\\ge', title: 'Lớn hơn hoặc bằng' },
    { label: '±', snippet: '\\pm', title: 'Cộng trừ' },
    { label: '∞', snippet: '\\infty', title: 'Vô cực' },
  ];

  return (
    <div className="space-y-2 mb-2">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900/80 rounded-xl border border-white/10 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
          <span>{label}</span>
        </div>

        {/* Math Quick Insert Buttons */}
        <div className="flex flex-wrap items-center gap-1">
          {mathButtons.map((btn, i) => (
            <button
              key={i}
              type="button"
              title={btn.title}
              onClick={() => onInsert(`$${btn.snippet}$`)}
              className="px-2 py-1 bg-white/5 hover:bg-brand-accent/20 hover:text-brand-accent text-slate-300 font-mono text-[11px] rounded-lg border border-white/5 transition-all"
            >
              {btn.label}
            </button>
          ))}

          {/* Block Formula Button */}
          <button
            type="button"
            title="Khối công thức riêng biệt"
            onClick={() => onInsert('\n$$\n\\frac{-b \\pm \\sqrt{\\Delta}}{2a}\n$$\n')}
            className="px-2 py-1 bg-brand-accent/20 text-brand-accent hover:bg-brand-accent/30 font-mono text-[11px] font-bold rounded-lg border border-brand-accent/30 transition-all"
          >
            $$ Khối $$
          </button>
        </div>

        {/* Action Toggles: Preview & Help */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
            title="Hướng dẫn gõ LaTeX"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              showPreview
                ? 'bg-brand-accent text-white shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPreview ? 'Đóng xem trước' : 'Xem trước'}</span>
          </button>
        </div>
      </div>

      {/* Help Guide Box */}
      {showHelp && (
        <div className="p-3 bg-brand-accent/10 border border-brand-accent/20 rounded-xl text-xs text-slate-300 space-y-1">
          <p className="font-bold text-white">💡 Hướng dẫn định dạng công thức khoa học:</p>
          <p>• Dùng <code className="text-brand-accent font-mono">$công_thức$</code> cho công thức nằm cùng dòng (ví dụ: <code className="text-slate-400 font-mono">Cho $x^2 - 4 = 0$</code>).</p>
          <p>• Dùng <code className="text-brand-accent font-mono">$$công_thức$$</code> cho công thức nằm riêng 1 khối căn giữa (ví dụ: tích phân, hệ phương trình phức tạp).</p>
          <p>• Hóa học: dùng <code className="text-brand-accent font-mono">{"$\\text{Fe} + 2\\text{HCl} \\rightarrow \\text{FeCl}_2 + \\text{H}_2\\uparrow$"}</code>.</p>
        </div>
      )}

      {/* Live Preview Box */}
      {showPreview && (
        <div className="p-4 bg-black/40 border border-brand-accent/30 rounded-2xl space-y-2">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <span>✨ Kết quả hiển thị thực tế (Học sinh sẽ nhìn thấy):</span>
          </div>
          {currentValue.trim() ? (
            <div className="text-white text-sm">
              <MathRenderer content={currentValue} />
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Chưa có nội dung để xem trước...</p>
          )}
        </div>
      )}
    </div>
  );
}
