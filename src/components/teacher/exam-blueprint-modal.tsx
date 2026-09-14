"use client";

import React, { useState, useRef } from 'react';
import { X, Sparkles, FileText, Upload, Download, Check, BookOpen, Layers, GraduationCap, Globe, RefreshCw } from 'lucide-react';
import { GradingStyle } from '@prisma/client';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface ExamBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  currentInstruction?: string | null;
  currentGradingStyle?: GradingStyle;
  onSaved?: () => void;
}

const PRESET_BLUEPRINTS = [
  {
    id: 'thpt_2025',
    title: 'THPT Quốc Gia 2025 (Bộ GD&ĐT)',
    description: 'Cấu trúc 3 phần mới nhất: Trắc nghiệm 4 lựa chọn (Phần I), Đúng/Sai chùm 4 ý (Phần II), Trả lời ngắn (Phần III).',
    badge: 'Khuyên dùng môn Toán/Lý/Hóa',
    gradingStyle: GradingStyle.THPT_QUOC_GIA,
    blueprint: `# CẤU TRÚC ĐỀ THI: TỐT NGHIỆP THPT TỪ NĂM 2025 (BỘ GIÁO DỤC & ĐÀO TẠO)
- Thang điểm tổng: 10.0 điểm
- Hình thức: 100% công thức Toán, Lý, Hóa BẮT BUỘC dùng LaTeX ($...$ inline, $$...$$ block)
- Bảng biến thiên hàm số: Bắt buộc dùng cú pháp LaTeX array trong $$...$$.

## PHẦN I: CÂU TRẮC NGHIỆM NHIỀU LỰA CHỌN (3.0 điểm)
- Số lượng: 12 câu hỏi (mỗi câu 0.25 điểm).
- Thí sinh chọn 1 phương án đúng duy nhất trong 4 phương án A, B, C, D.

## PHẦN II: CÂU TRẮC NGHIỆM ĐÚNG / SAI (4.0 điểm)
- Số lượng: 4 câu hỏi lớn (mỗi câu 1.0 điểm).
- Mỗi câu gồm 1 bối cảnh/bài toán chung và 4 lệnh hỏi/mệnh đề độc lập a), b), c), d).
- Thí sinh chọn Đúng hoặc Sai cho từng ý a, b, c, d.
- Barem tính điểm Bộ GD&ĐT:
  * Đúng 1 ý: 0.1 điểm
  * Đúng 2 ý: 0.25 điểm
  * Đúng 3 ý: 0.5 điểm
  * Đúng cả 4 ý: 1.0 điểm

## PHẦN III: CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN (3.0 điểm)
- Số lượng: 6 câu hỏi (mỗi câu 0.5 điểm).
- Thí sinh điền kết quả đáp số cuối cùng (số nguyên hoặc số thập phân/phân số).`
  },
  {
    id: 'dai_hoc_tu_luan',
    title: 'Đại học & Cao đẳng (Tự luận Chuyên sâu)',
    description: 'Dành cho các môn Toán cao cấp, Vật lý đại cương, Hóa đại cương, bài toán kỹ thuật phân bước.',
    badge: 'ĐH Bách Khoa / ĐHQG',
    gradingStyle: GradingStyle.CO_BAN,
    blueprint: `# CẤU TRÚC ĐỀ THI: ĐẠI HỌC / CAO ĐẲNG (TỰ LUẬN PHÂN BƯỚC)
- Thang điểm tổng: 10.0 điểm
- Hình thức: Tự luận giải toán, tính toán kỹ thuật và chứng minh lý thuyết.
- Quy chuẩn biểu diễn: Công thức Toán/Lý/Hóa bắt buộc đặt trong $...$ và $$...$$.

## BÀI 1: Lý thuyết cơ sở & Biến đổi căn bản (2.0 điểm)
- Kiểm tra định lý, tính chất và điều kiện tồn tại nghiệm.

## BÀI 2: Tính toán & Khảo sát vi/tích phân hoặc hiện tượng (3.0 điểm)
- Gồm 2 ý: a) Tìm nghiệm/đạo hàm/tích phân (1.5đ); b) Biện luận hoặc ứng dụng cực trị (1.5đ).

## BÀI 3: Bài toán ứng dụng kỹ thuật / Mô hình thực tế (3.0 điểm)
- Yêu cầu thí sinh thiết lập phương trình từ bài toán thực tế và giải chi tiết từng bước.

## BÀI 4: Câu hỏi phân loại nâng cao (2.0 điểm)
- Bất đẳng thức, tối ưu hóa hoặc giải thuật chuyên sâu.`
  },
  {
    id: 'cambridge_ib',
    title: 'Chuẩn Quốc Tế (Cambridge / IB / SAT)',
    description: 'Dành cho trường Song ngữ, Quốc tế. Đề thi cấu trúc theo câu hỏi phân nhánh với Barem Method & Accuracy Marks.',
    badge: 'International Standards',
    gradingStyle: GradingStyle.CAMBRIDGE,
    blueprint: `# EXAM STRUCTURE: INTERNATIONAL ASSESSMENT (CAMBRIDGE / IB STANDARD)
- Total Marks: 50 - 100 Marks
- Standard: Strict Math LaTeX notation ($...$ and $$...$$).

## SECTION A: Core Knowledge & Guided Calculations
- Structured questions with sub-parts: (a)(i), (a)(ii), (b).
- Rubric based on Method Marks [M] and Accuracy Marks [A].

## SECTION B: Problem Solving & Critical Investigation
- Unstructured scenarios requiring students to show full working, state assumptions, and interpret conclusions with units.`
  },
  {
    id: 'custom_free',
    title: 'Đề Tự do / Kiểm tra Thường xuyên',
    description: 'Linh hoạt cho mọi mục đích kiểm tra 15 phút, 1 tiết hoặc bài tập về nhà.',
    badge: 'Linh hoạt',
    gradingStyle: GradingStyle.CUSTOM,
    blueprint: `# CẤU TRÚC ĐỀ THI KIỂM TRA THƯỜNG XUYÊN
- Thang điểm: 10.0 điểm
- Quy định chung: Giáo viên và AI chấm điểm dựa trên độ chính xác và phương pháp làm bài.
- Mọi công thức Toán/Lý/Hóa phải hiển thị bằng LaTeX ($...$).`
  }
];

export function ExamBlueprintModal({
  isOpen,
  onClose,
  assignmentId,
  currentInstruction,
  currentGradingStyle = GradingStyle.THPT_QUOC_GIA,
  onSaved
}: ExamBlueprintModalProps) {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<'presets' | 'learn' | 'custom'>('presets');
  const [instruction, setInstruction] = useState(currentInstruction || PRESET_BLUEPRINTS[0].blueprint);
  const [selectedGradingStyle, setSelectedGradingStyle] = useState<GradingStyle>(currentGradingStyle);

  // Learn from sample exam state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedSummary, setAnalyzedSummary] = useState<string | null>(null);
  const sampleFileInputRef = useRef<HTMLInputElement>(null);
  const mdFileInputRef = useRef<HTMLInputElement>(null);

  const updateMutation = trpc.assignment.updatePrompt.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu Cấu trúc Đề thi (AI Blueprint) thành công!");
      utils.assignment.getById.invalidate({ id: assignmentId });
      if (onSaved) onSaved();
      onClose();
    },
    onError: (err) => {
      toast.error("Lỗi khi lưu cấu trúc: " + err.message);
    }
  });

  const handleApplyPreset = (preset: typeof PRESET_BLUEPRINTS[0]) => {
    setInstruction(preset.blueprint);
    setSelectedGradingStyle(preset.gradingStyle);
    setActiveTab('custom');
    toast.info(`Đã nạp mẫu "${preset.title}". Bạn có thể xem lại và bấm Lưu.`);
  };

  const handleLearnFromSample = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/v1/assignments/${assignmentId}/extract-blueprint`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error("Lỗi phân tích đề mẫu: " + (data.error?.message || "Không thể phân tích"));
      } else {
        toast.success("AI đã phân tích xong cấu trúc đề thi mẫu!");
        setAnalyzedSummary(data.data.summary);
        setInstruction(data.data.blueprint);
        setActiveTab('custom');
      }
    } catch (err: any) {
      toast.error("Lỗi tải đề mẫu: " + err.message);
    } finally {
      setIsAnalyzing(false);
      if (sampleFileInputRef.current) sampleFileInputRef.current.value = '';
    }
  };

  const handleImportMd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setInstruction(text);
        toast.success(`Đã tải lên file Markdown: ${file.name}`);
      }
    };
    reader.readAsText(file);
    if (mdFileInputRef.current) mdFileInputRef.current.value = '';
  };

  const handleExportMd = () => {
    const blob = new Blob([instruction], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Exam_Blueprint_${assignmentId.slice(0, 8)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất file cấu trúc đề thi (.md)");
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: assignmentId,
      aiGradingInstruction: instruction,
      gradingStyle: selectedGradingStyle
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 shadow-2xl overflow-hidden bg-slate-950/90 text-white">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-accent/20 flex items-center justify-center text-brand-accent">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Thiết Lập Cấu Trúc Đề Thi & AI Blueprint
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30">
                  Linh hoạt theo trường
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Định hình ma trận câu hỏi, thang điểm và quy chuẩn Toán/Lý/Hóa để AI tạo đề chính xác 100%
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-6 bg-black/20 gap-2">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'presets'
                ? 'border-brand-accent text-brand-accent'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Mẫu Có Sẵn (Presets)
          </button>

          <button
            onClick={() => setActiveTab('learn')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'learn'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Học Từ Đề Mẫu Cũ (AI Reverse)
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'custom'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" /> Soạn Thảo & File .MD
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="text-sm text-slate-300">
                Chọn một cấu trúc chuẩn phù hợp với chương trình giảng dạy của bạn để áp dụng ngay:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRESET_BLUEPRINTS.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:border-brand-accent/50 hover:bg-white/[0.08] transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent">
                          {preset.badge}
                        </span>
                        {preset.gradingStyle === GradingStyle.THPT_QUOC_GIA && (
                          <GraduationCap className="w-5 h-5 text-amber-400" />
                        )}
                        {preset.gradingStyle === GradingStyle.CAMBRIDGE && (
                          <Globe className="w-5 h-5 text-sky-400" />
                        )}
                      </div>
                      <h3 className="font-bold text-lg text-white group-hover:text-brand-accent transition-colors">
                        {preset.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleApplyPreset(preset)}
                      className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-brand-accent/20 hover:bg-brand-accent text-brand-accent hover:text-white font-bold text-sm transition-all"
                    >
                      <Check className="w-4 h-4" /> Áp dụng cấu trúc này
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: LEARN FROM SAMPLE EXAM */}
          {activeTab === 'learn' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-300 text-sm leading-relaxed">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                  <Sparkles className="w-5 h-5" /> Tính năng Tự Động Học Ma Trận Đề
                </div>
                Bạn không cần gõ prompt! Chỉ cần tải lên <strong>1 file đề thi cũ (PDF hoặc Ảnh)</strong> của trường bạn. 
                AI sẽ phân tích bố cục, các dạng câu hỏi, thang điểm và quy ước của trường để tạo ra bản <strong>AI Blueprint</strong> chuẩn xác.
              </div>

              {/* Upload Box */}
              <div className="border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-3xl p-8 text-center bg-black/20 transition-all relative group">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleLearnFromSample}
                  ref={sampleFileInputRef}
                  disabled={isAnalyzing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="w-16 h-16 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 mx-auto mb-4 group-hover:scale-110 transition-transform">
                  {isAnalyzing ? (
                    <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>
                <h4 className="text-lg font-bold text-white mb-1">
                  {isAnalyzing ? "AI đang đọc và bóc tách ma trận đề mẫu..." : "Bấm hoặc Kéo thả file Đề Thi Mẫu vào đây"}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Hỗ trợ file PDF, Ảnh chụp đề thi (.png, .jpg). Hệ thống sẽ phân tích các phần thi, dạng câu và bareme điểm.
                </p>
              </div>

              {analyzedSummary && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center justify-between">
                  <span>✅ {analyzedSummary}</span>
                  <button
                    onClick={() => setActiveTab('custom')}
                    className="text-xs font-bold underline hover:text-white"
                  >
                    Xem chi tiết Blueprint &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOM MARKDOWN PROMPT */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-400">Tiêu chuẩn chấm:</label>
                  <select
                    value={selectedGradingStyle}
                    onChange={(e) => setSelectedGradingStyle(e.target.value as GradingStyle)}
                    className="glass-input px-3 py-1.5 rounded-lg text-xs text-white bg-black/40"
                  >
                    <option value={GradingStyle.THPT_QUOC_GIA}>THPT Quốc Gia (Bareme Bộ GD)</option>
                    <option value={GradingStyle.CO_BAN}>Tự luận Đại học / Toán Lý</option>
                    <option value={GradingStyle.CAMBRIDGE}>Cambridge / IB Quốc tế</option>
                    <option value={GradingStyle.SANG_TAO}>Văn sáng tạo / Tiểu luận</option>
                    <option value={GradingStyle.CUSTOM}>Tùy chỉnh riêng</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {/* Import .md file */}
                  <input
                    type="file"
                    accept=".md,.txt"
                    onChange={handleImportMd}
                    ref={mdFileInputRef}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => mdFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Nạp file .md
                  </button>

                  {/* Export .md file */}
                  <button
                    type="button"
                    onClick={handleExportMd}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Xuất file .md
                  </button>
                </div>
              </div>

              {/* Textarea for Blueprint */}
              <div className="relative">
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  className="w-full h-80 bg-black/40 p-4 rounded-2xl border border-white/10 text-white font-mono text-xs leading-relaxed focus:outline-none focus:border-brand-accent/60 resize-none"
                  placeholder="Nhập nội dung ma trận cấu trúc đề thi (Markdown)..."
                />
                <div className="absolute bottom-3 right-4 text-[10px] text-slate-500 font-mono">
                  {instruction.length} ký tự
                </div>
              </div>

              <p className="text-xs text-slate-400 italic">
                💡 Mẹo: Bạn có thể sao chép ma trận đề từ Word hoặc đề cương của trường dán vào đây. AI sẽ dùng nội dung này làm "Kim chỉ nam" mỗi khi tạo hoặc bóc tách câu hỏi.
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white font-medium text-sm transition-colors"
          >
            Đóng
          </button>

          <button
            onClick={handleSave}
            disabled={updateMutation.isPending || !instruction.trim()}
            className="flex items-center gap-2 bg-brand-accent hover:bg-indigo-600 text-white px-7 py-2.5 rounded-xl font-bold text-sm shadow-premium transition-all disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Đang lưu...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Lưu cấu trúc đề thi
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
