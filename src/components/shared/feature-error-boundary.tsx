"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  featureName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * FeatureErrorBoundary: Cách ly lỗi theo từng chức năng (Fault Isolation)
 * Giúp khi 1 chức năng (như OCR, Tải ảnh,...) gặp sự cố bất ngờ thì:
 * - Các chức năng khác (nhập bài, danh sách câu hỏi, đồng hồ, nộp bài) vẫn hoạt động 100% bình thường.
 * - Tránh hoàn toàn tình trạng trang web bị "đen thui" hoặc sập toàn bộ ứng dụng.
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || "Đã xảy ra sự cố không xác định.",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[FeatureErrorBoundary - ${this.props.featureName || "Feature"}] Error:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-200 my-3 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Chức năng &quot;{this.props.featureName || "này"}&quot; tạm thời gặp sự cố</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Hệ thống đã tự động cách ly sự cố để đảm bảo các phần khác của bài thi vẫn hoạt động bình thường. Bạn có thể thử lại hoặc chuyển sang hình thức làm tự luận gõ phím.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs transition-all border border-amber-500/30"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Thử lại chức năng
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
