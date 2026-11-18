"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy, Download, MessageSquareShare, X } from "lucide-react";
import {
  DEFAULT_EXPORT_OPTIONS,
  formatAsMarkdown,
  formatForZalo,
  type ExportSelectionOptions,
} from "@/lib/exporters";
import type { SessionPayload } from "@/types/paper";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  session: SessionPayload;
}

export function ExportModal({ open, onClose, session }: ExportModalProps) {
  const [options, setOptions] = useState<ExportSelectionOptions>(
    DEFAULT_EXPORT_OPTIONS
  );
  const [previewTab, setPreviewTab] = useState<"zalo" | "markdown">("zalo");
  const [copiedMode, setCopiedMode] = useState<"zalo" | "markdown" | null>(
    null
  );

  const zaloText = useMemo(
    () => formatForZalo(session, options),
    [session, options]
  );
  const markdownText = useMemo(
    () => formatAsMarkdown(session, options),
    [session, options]
  );

  if (!open) return null;

  const handleCopy = async (mode: "zalo" | "markdown") => {
    const content = mode === "zalo" ? zaloText : markdownText;
    await navigator.clipboard.writeText(content);
    setCopiedMode(mode);
    setTimeout(() => setCopiedMode(null), 2200);
  };

  const handleDownloadMd = () => {
    const safeName = session.fileName
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9_\-\u00C0-\u1EF9]/g, "_")
      .slice(0, 60);
    const blob = new Blob([markdownText], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Phan_tich_${safeName || "bai_bao"}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toggleOption = (key: keyof ExportSelectionOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Sao chép gửi thảo luận nhóm Zalo / Tải tệp Markdown
            </h2>
            <p className="text-xs text-slate-500">
              Giữ nguyên nhãn phân biệt lời tác giả – nhận xét AI và số trang
              PDF dẫn chứng.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-2 border-b border-slate-200 bg-slate-50 px-6 py-3 sm:grid-cols-3">
          {(
            [
              ["includeQuickRead", "1. Hiểu nhanh (5 ý chính)"],
              ["includeFullAnalysis", "2. Phân tích đầy đủ"],
              ["includeVisualElements", "3. Bảng, Hình & Công thức"],
              ["includeGlossary", "4. Bảng thuật ngữ"],
              [
                "includeChatHistory",
                `5. Lịch sử hỏi đáp (${session.chatHistory.length})`,
              ],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 select-none"
            >
              <input
                type="checkbox"
                checked={options[key]}
                onChange={() => toggleOption(key)}
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-2 border-b border-slate-200 px-6 pt-3">
          <button
            type="button"
            onClick={() => setPreviewTab("zalo")}
            className={`cursor-pointer border-b-2 px-3 py-2 text-sm font-medium transition ${
              previewTab === "zalo"
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Xem trước định dạng Zalo (Sạch, dễ đọc)
          </button>
          <button
            type="button"
            onClick={() => setPreviewTab("markdown")}
            className={`cursor-pointer border-b-2 px-3 py-2 text-sm font-medium transition ${
              previewTab === "markdown"
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Xem trước Markdown (.md)
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-xs leading-relaxed text-slate-800">
            {previewTab === "zalo" ? zaloText : markdownText}
          </pre>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-2xl">
          <button
            type="button"
            onClick={() => handleCopy("zalo")}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-800"
          >
            {copiedMode === "zalo" ? (
              <>
                <Check className="h-4 w-4" />
                Đã sao chép — Dán ngay vào Zalo!
              </>
            ) : (
              <>
                <MessageSquareShare className="h-4 w-4" />
                Sao chép gửi Zalo
              </>
            )}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy("markdown")}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {copiedMode === "markdown" ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  Đã chép Markdown
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Sao chép .md
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadMd}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
              Tải tệp .md
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
