"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUp,
  BookMarked,
  FileImage,
  Loader2,
  MessageSquareText,
} from "lucide-react";
import { StatementList } from "./StatementCard";
import type { ChatTurn, ResolvedCitation } from "@/types/paper";

interface ChatPanelProps {
  fileName: string;
  chatHistory: ChatTurn[];
  pendingQuestion: string | null;
  currentPdfPage: number;
  citationMap: Record<string, ResolvedCitation>;
  onSelectCitation: (anchor: ResolvedCitation) => void;
  onSendQuestion: (
    questionVi: string,
    focusPdfPage: number | null
  ) => Promise<void>;
  sending: boolean;
  chatError: string | null;
}

export function ChatPanel({
  fileName,
  chatHistory,
  pendingQuestion,
  currentPdfPage,
  citationMap,
  onSelectCitation,
  onSendQuestion,
  sending,
  chatError,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [focusCurrentPage, setFocusCurrentPage] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  // Auto-focus composer when opening ChatPanel
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-scroll to latest message or pending bubble
  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory.length, pendingQuestion, sending, chatError]);

  // Auto-resize textarea height cleanly (up to 140px)
  const adjustTextareaHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(140, Math.max(44, el.scrollHeight))}px`;
  };

  const submitCurrentInput = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
    await onSendQuestion(trimmed, focusCurrentPage ? currentPdfPage : null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCurrentInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitCurrentInput();
    }
  };

  const isEmpty = chatHistory.length === 0 && !pendingQuestion;

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* Scrollable Conversation Stream */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {isEmpty ? (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-200">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <h3 className="mt-3.5 text-base font-bold text-slate-900">
              Trò chuyện & Hỏi sâu trên tài liệu gốc
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Nhập bất kỳ câu hỏi nào bằng tiếng Việt về nội dung, phương pháp,
              giả định, số liệu, công thức hoặc bảng biểu trong{" "}
              <span className="font-medium text-slate-800">{fileName}</span>.
              Mọi nhận định từ bài báo đều đính kèm dẫn chứng để bạn bấm đối
              chiếu trực tiếp trên PDF.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {chatHistory.map((turn) => (
              <div key={turn.id} className="space-y-3">
                {/* User Message Bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm leading-relaxed text-white shadow-2xs">
                    {turn.questionVi}
                  </div>
                </div>

                {/* Assistant Grounded Answer */}
                <div className="space-y-2.5 rounded-2xl rounded-tl-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
                  <StatementList
                    statements={turn.answer.inPaperAnswers}
                    citationMap={citationMap}
                    onSelectCitation={onSelectCitation}
                    emptyText="Nội dung bạn hỏi không được tác giả trình bày trực tiếp trong bài báo này."
                  />

                  {turn.answer.notInPaperNoticeVi && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs leading-relaxed text-amber-950">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <div>
                        <span className="font-semibold">
                          Thông tin không nêu trong bài báo:{" "}
                        </span>
                        {turn.answer.notInPaperNoticeVi}
                      </div>
                    </div>
                  )}

                  {turn.answer.externalKnowledgeBox && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                        <BookMarked className="h-4 w-4 text-slate-600" />
                        Kiến thức nền bổ sung ngoài bài báo
                      </div>
                      <p className="mt-1">
                        {turn.answer.externalKnowledgeBox.explanationVi}
                      </p>
                      {turn.answer.externalKnowledgeBox.verifiableSources
                        .length > 0 && (
                        <p className="mt-1.5 text-[11px] text-slate-500">
                          <span className="font-semibold">
                            Nguồn tài liệu chuẩn để kiểm tra:
                          </span>{" "}
                          {turn.answer.externalKnowledgeBox.verifiableSources.join(
                            " • "
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Optimistic In-Flight User Question + Thinking Indicator */}
            {pendingQuestion && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm leading-relaxed text-white shadow-2xs">
                    {pendingQuestion}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-600 shadow-2xs">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-teal-700" />
                  <span>Đang đọc đối chiếu bài báo gốc và trích dẫn chứng...</span>
                </div>
              </div>
            )}

            {chatError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {chatError}
              </div>
            )}

            <div ref={bottomAnchorRef} />
          </div>
        )}
      </div>

      {/* NotebookLM-Style Pinned Bottom Composer */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 pt-3 pb-20 sm:px-5 lg:pb-3.5">
        <form
          onSubmit={handleFormSubmit}
          className="mx-auto max-w-3xl rounded-2xl border border-slate-300 bg-slate-50/80 p-2 shadow-2xs transition focus-within:border-teal-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-600/15"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            disabled={sending}
            onKeyDown={handleKeyDown}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight(e.target);
            }}
            placeholder="Nhập câu hỏi của bạn về bài báo... (Nhấn Enter để gửi, Shift + Enter để xuống dòng)"
            className="max-h-[140px] min-h-[44px] w-full resize-none bg-transparent px-2.5 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 px-2 pt-2">
            <button
              type="button"
              onClick={() => setFocusCurrentPage((v) => !v)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                focusCurrentPage
                  ? "border-teal-500 bg-teal-50 text-teal-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
              title="Bật khi bạn muốn hỏi trực tiếp về hình vẽ, biểu đồ hoặc công thức nằm trên trang PDF đang mở bên trái"
            >
              <FileImage className="h-3.5 w-3.5" />
              <span>
                {focusCurrentPage
                  ? `Đang kèm ảnh trang PDF ${currentPdfPage}`
                  : `Kèm ảnh trang đang mở (tr.${currentPdfPage})`}
              </span>
            </button>

            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Gửi câu hỏi"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang trả lời...</span>
                </>
              ) : (
                <>
                  <span>Hỏi</span>
                  <ArrowUp className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
