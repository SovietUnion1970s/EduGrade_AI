"use client";

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Component render nội dung kết hợp giữa Text thuần và Công thức Toán KaTeX:
 * - $công_thức$: Inline Math (cùng dòng)
 * - $$công_thức$$: Block Math (khối độc lập căn giữa)
 */
export function MathRenderer({ content, className = '' }: MathRendererProps) {
  const renderedElements = useMemo(() => {
    if (!content) return null;

    // Phân tách text dựa trên $$...$$ (block) và $...$ (inline)
    // Regex bắt:
    // 1. $$([\s\S]*?)$$ -> Block Math
    // 2. \$([^\$\n]+?)\$ -> Inline Math
    const tokenRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    const parts = content.split(tokenRegex);

    return parts.map((part, index) => {
      // 1. Kiểm tra Block Math: $$...$$
      if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
        const math = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(math, {
            displayMode: true,
            throwOnError: false,
            strict: false,
          });
          return (
            <div
              key={`math-block-${index}`}
              className="my-3 overflow-x-auto text-center py-2 px-3 bg-white/[0.02] rounded-xl border border-white/5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <div key={`err-${index}`} className="my-2 p-2 rounded bg-red-900/20 text-red-400 font-mono text-xs">
              {part}
            </div>
          );
        }
      }

      // 2. Kiểm tra Inline Math: $...$
      if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
        const math = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(math, {
            displayMode: false,
            throwOnError: false,
            strict: false,
          });
          return (
            <span
              key={`math-inline-${index}`}
              className="inline-block px-1 align-baseline"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <span key={`err-${index}`} className="text-red-400 font-mono text-xs">
              {part}
            </span>
          );
        }
      }

      // 3. Text thông thường (giữ nguyên xuống dòng)
      return (
        <span key={`text-${index}`} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  }, [content]);

  return <div className={`leading-relaxed ${className}`}>{renderedElements}</div>;
}
