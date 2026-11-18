"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  MessageSquare,
  MessageSquareShare,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  getLocalSecretForSession,
  removeLocalSession,
  updateLocalSessionDomain,
} from "@/lib/client-sessions";
import {
  citationToHighlight,
  PdfDocumentViewer,
  type ActivePdfHighlight,
} from "@/components/PdfDocumentViewer";
import {
  ReadingTabsPanel,
  type ReadingModeTab,
} from "@/components/ReadingTabsPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { ExportModal } from "@/components/ExportModal";
import { PrivacyModal } from "@/components/PrivacyModal";
import type {
  ChatTurn,
  DeepSectionExplanation,
  DepthLevel,
  DetectedSection,
  ExplainedVisualElement,
  ResolvedCitation,
  SessionPayload,
} from "@/types/paper";

type RightPanelView = ReadingModeTab | "chat";
type MobilePane = "analysis" | "pdf" | "chat";

export default function DocumentWorkspacePage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [sessionSecret, setSessionSecret] = useState<string | null>(null);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);

  // Desktop & Reading navigation
  const [rightTab, setRightTab] = useState<RightPanelView>("quick");
  const [mobilePane, setMobilePane] = useState<MobilePane>("analysis");
  const [returnFromCitation, setReturnFromCitation] = useState<
    "analysis" | "chat" | null
  >(null);

  // Split-pane drag resize on desktop
  const [leftWidthPct, setLeftWidthPct] = useState<number>(48);
  const draggingDividerRef = useRef(false);

  // PDF interaction states
  const [activeHighlight, setActiveHighlight] =
    useState<ActivePdfHighlight | null>(null);
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [warningsExpanded, setWarningsExpanded] = useState<boolean>(false);

  // Deep read & Chat async states
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState<string | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [quickQuestionInput, setQuickQuestionInput] = useState("");

  // Modals
  const [exportOpen, setExportOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load initial session + connect SSE if processing
  useEffect(() => {
    const secret = getLocalSecretForSession(sessionId);
    setSessionSecret(secret);

    let eventSource: EventSource | null = null;
    let cancelled = false;

    async function fetchInitial() {
      try {
        const headers: Record<string, string> = {};
        if (secret && secret !== "demo") {
          headers["x-session-secret"] = secret;
        }
        const res = await fetch(`/api/sessions/${sessionId}`, { headers });
        const data = (await res.json()) as {
          payload?: SessionPayload;
          errorVi?: string;
        };

        if (!res.ok || !data.payload) {
          if (!cancelled) {
            setNotFoundError(
              data.errorVi ||
                "Phiên làm việc không tồn tại, đã quá 24 giờ hoặc đã bị xóa."
            );
          }
          return;
        }

        if (cancelled) return;
        setSession(data.payload);
        if (data.payload.sections.length > 0) {
          setSelectedSectionId(data.payload.sections[0].sectionId);
        }
        if (data.payload.analysis?.domainLabelVi) {
          updateLocalSessionDomain(
            sessionId,
            data.payload.analysis.domainLabelVi
          );
        }

        if (data.payload.status === "processing" && sessionId !== "demo") {
          const tokenParam = secret
            ? `?token=${encodeURIComponent(secret)}`
            : "";
          eventSource = new EventSource(
            `/api/sessions/${sessionId}/events${tokenParam}`
          );
          eventSource.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data) as {
                type: string;
                payload: SessionPayload;
              };
              if (msg.payload) {
                setSession(msg.payload);
                if (msg.payload.sections.length > 0) {
                  setSelectedSectionId(
                    (prev) => prev || msg.payload.sections[0].sectionId
                  );
                }
                if (msg.payload.analysis?.domainLabelVi) {
                  updateLocalSessionDomain(
                    sessionId,
                    msg.payload.analysis.domainLabelVi
                  );
                }
                if (msg.payload.status !== "processing") {
                  eventSource?.close();
                }
              }
            } catch {
              // Ignore malformed SSE message
            }
          };
        }
      } catch {
        if (!cancelled) {
          setNotFoundError("Không thể kết nối tới máy chủ để mở phiên làm việc.");
        }
      }
    }

    void fetchInitial();
    return () => {
      cancelled = true;
      eventSource?.close();
    };
  }, [sessionId]);

  // Desktop draggable divider handlers
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingDividerRef.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setLeftWidthPct(Math.max(30, Math.min(68, pct)));
    };
    const onMouseUp = () => {
      draggingDividerRef.current = false;
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const triggerPdfHighlight = useCallback(
    (highlight: ActivePdfHighlight, fromMobileSource: "analysis" | "chat") => {
      setActiveHighlight(highlight);
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setReturnFromCitation(fromMobileSource);
        setMobilePane("pdf");
      }
    },
    []
  );

  const handleSelectCitation = useCallback(
    (anchor: ResolvedCitation) => {
      triggerPdfHighlight(
        citationToHighlight(anchor),
        rightTab === "chat" ? "chat" : "analysis"
      );
    },
    [rightTab, triggerPdfHighlight]
  );

  const handleJumpToElement = useCallback(
    (el: ExplainedVisualElement) => {
      triggerPdfHighlight(
        {
          pdfPage: el.pdfPage,
          bbox: el.bbox,
          label: el.label,
          snippet: el.contentSummaryVi,
          nonce: Date.now(),
        },
        "analysis"
      );
    },
    [triggerPdfHighlight]
  );

  const handleJumpToPdfPage = useCallback(
    (pdfPage: number) => {
      triggerPdfHighlight(
        {
          pdfPage,
          bbox: null,
          nonce: Date.now(),
        },
        "analysis"
      );
    },
    [triggerPdfHighlight]
  );

  const handleRequestDeepRead = async (
    sectionId: string,
    depth: DepthLevel
  ) => {
    setDeepLoading(true);
    setDeepError(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionSecret && sessionSecret !== "demo") {
        headers["x-session-secret"] = sessionSecret;
      }
      const res = await fetch(`/api/sessions/${sessionId}/deep-read`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sectionId, depth }),
      });
      const data = (await res.json()) as {
        key?: string;
        explanation?: DeepSectionExplanation;
        errorVi?: string;
      };
      if (!res.ok || !data.key || !data.explanation) {
        setDeepError(data.errorVi || "Không thể tạo nội dung Đọc sâu.");
        return;
      }
      setSession((prev) =>
        prev
          ? {
              ...prev,
              deepExplanations: {
                ...prev.deepExplanations,
                [data.key!]: data.explanation!,
              },
            }
          : prev
      );
    } catch {
      setDeepError("Lỗi kết nối khi yêu cầu giải thích sâu mục này.");
    } finally {
      setDeepLoading(false);
    }
  };

  const handleSendQuestion = async (
    questionVi: string,
    focusPdfPage: number | null
  ) => {
    setChatSending(true);
    setPendingQuestion(questionVi);
    setChatError(null);
    setRightTab("chat");
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobilePane("chat");
    }
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionSecret && sessionSecret !== "demo") {
        headers["x-session-secret"] = sessionSecret;
      }
      const res = await fetch(`/api/sessions/${sessionId}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ questionVi, focusPdfPage }),
      });
      const data = (await res.json()) as {
        turn?: ChatTurn;
        errorVi?: string;
      };
      if (!res.ok || !data.turn) {
        setChatError(data.errorVi || "Không thể trả lời câu hỏi lúc này.");
        return;
      }
      setSession((prev) =>
        prev
          ? {
              ...prev,
              chatHistory: [...prev.chatHistory, data.turn!],
            }
          : prev
      );
    } catch {
      setChatError("Lỗi kết nối máy chủ khi gửi câu hỏi.");
    } finally {
      setPendingQuestion(null);
      setChatSending(false);
    }
  };

  const handleRetryProcessing = async () => {
    const headers: Record<string, string> = {};
    if (sessionSecret && sessionSecret !== "demo") {
      headers["x-session-secret"] = sessionSecret;
    }
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "POST",
      headers,
    });
    if (res.ok) {
      window.location.reload();
    }
  };

  const handleDeleteSession = async () => {
    if (session?.isDemo) {
      router.push("/");
      return;
    }
    const confirmed = window.confirm(
      "Xóa ngay tệp PDF gốc, bản phân tích và toàn bộ lịch sử hỏi đáp của phiên này khỏi máy chủ?"
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const headers: Record<string, string> = {};
      if (sessionSecret) headers["x-session-secret"] = sessionSecret;
      await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
        headers,
      });
    } finally {
      removeLocalSession(sessionId);
      router.push("/");
    }
  };

  const handleOutlineSectionSelect = (sec: DetectedSection) => {
    setSelectedSectionId(sec.sectionId);
  };

  if (notFoundError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-3 text-lg font-bold text-slate-900">
            Không thể mở phiên làm việc
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {notFoundError}
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay về trang chủ để tải PDF mới
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-teal-700" />
        Đang mở không gian đọc hiểu...
      </div>
    );
  }

  const warnings = session.extractionReport?.warnings ?? [];
  const pdfUrl = `/api/sessions/${sessionId}/pdf`;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      {/* Demo Mode Explicit Banner */}
      {session.isDemo && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-1.5 text-xs font-semibold text-slate-950">
          <span>
            ⚠️ BẢN XEM MẪU MINH HỌA GIAO DIỆN — Dữ liệu giả định để thử nghiệm
            đối chiếu dẫn chứng, không phải bài báo thật của bạn.
          </span>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="cursor-pointer rounded bg-slate-950 px-2.5 py-0.5 text-white hover:bg-slate-800"
          >
            Tải PDF thật của bạn →
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tải bài khác</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-slate-900">
                {session.fileName}
              </span>
              {session.analysis && (
                <span className="hidden shrink-0 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 ring-1 ring-teal-200 md:inline">
                  {session.analysis.domainLabelVi}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {session.analysis && (
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-teal-800"
            >
              <MessageSquareShare className="h-3.5 w-3.5" />
              <span>Gửi Zalo / Tải .md</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            title="Thông tin quyền riêng tư & thời hạn lưu 24 giờ"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
            <span className="hidden xl:inline">24h Riêng tư</span>
          </button>

          {!session.isDemo && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleDeleteSession()}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              title="Xóa ngay tài liệu & hội thoại khỏi máy chủ"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Xóa phiên</span>
            </button>
          )}
        </div>
      </header>

      {/* Workspace Split Area */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT COLUMN: Original PDF Viewer */}
        <div
          style={{ width: `${leftWidthPct}%` }}
          className={`${
            mobilePane === "pdf" ? "flex w-full!" : "hidden"
          } h-full flex-col lg:flex`}
        >
          <PdfDocumentViewer
            pdfUrl={pdfUrl}
            sessionSecret={sessionSecret}
            pageMappings={session.pageMappings}
            sections={session.sections}
            warningCount={warnings.length}
            onShowWarningsClick={() => {
              setWarningsExpanded(true);
              setMobilePane("analysis");
            }}
            activeHighlight={activeHighlight}
            onCurrentPageChange={setCurrentPdfPage}
            onSectionSelect={handleOutlineSectionSelect}
          />

          {/* Floating Return Pill on Mobile when jumped from a citation */}
          {mobilePane === "pdf" && returnFromCitation && (
            <button
              type="button"
              onClick={() => {
                const dest = returnFromCitation;
                setReturnFromCitation(null);
                setMobilePane(dest);
              }}
              className="fixed bottom-16 left-1/2 z-30 -translate-x-1/2 cursor-pointer rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg ring-2 ring-white lg:hidden"
            >
              ← Quay lại đoạn tiếng Việt đang đọc
            </button>
          )}
        </div>

        {/* Desktop Draggable Divider */}
        <div
          onMouseDown={() => {
            draggingDividerRef.current = true;
            document.body.style.userSelect = "none";
          }}
          title="Kéo để thay đổi độ rộng 2 khung"
          className="hidden w-1.5 shrink-0 cursor-col-resize bg-slate-300/80 transition hover:bg-teal-600 lg:block"
        />

        {/* RIGHT COLUMN: Analysis, Glossary & Vietnamese Q&A */}
        <div
          style={{ width: `${100 - leftWidthPct}%` }}
          className={`${
            mobilePane !== "pdf" ? "flex w-full!" : "hidden"
          } h-full flex-col bg-slate-50 lg:flex`}
        >
          {/* Right Mode Tabs (Desktop shows all 5; Mobile syncs Analysis vs Chat) */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-slate-200 bg-white px-3 py-2">
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  ["quick", "1. Hiểu nhanh"],
                  ["full", "2. Đầy đủ"],
                  ["deep", "3. Đọc sâu"],
                  [
                    "glossary",
                    `Thuật ngữ${
                      session.analysis
                        ? ` (${session.analysis.glossary.length})`
                        : ""
                    }`,
                  ],
                  [
                    "chat",
                    `Hỏi đáp${
                      session.chatHistory.length > 0
                        ? ` (${session.chatHistory.length})`
                        : ""
                    }`,
                  ],
                ] as const
              ).map(([tabKey, label]) => {
                const isChat = tabKey === "chat";
                return (
                  <button
                    key={tabKey}
                    type="button"
                    disabled={!session.analysis && session.status !== "complete"}
                    onClick={() => {
                      setRightTab(tabKey);
                      if (isChat) setMobilePane("chat");
                      else setMobilePane("analysis");
                    }}
                    className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-45 ${
                      (mobilePane === "chat" && isChat) ||
                      (mobilePane !== "chat" && rightTab === tabKey)
                        ? "bg-teal-700 text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    } ${isChat ? "hidden lg:inline-flex" : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Extraction Quality Status Bar (Complete vs Partial/Degraded) */}
          {session.extractionReport && session.status !== "processing" && (
            <div
              className={`shrink-0 border-b px-4 py-2 text-xs ${
                warnings.length > 0
                  ? "border-amber-200 bg-amber-50 text-amber-950"
                  : "border-emerald-200 bg-emerald-50/70 text-emerald-900"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-medium">
                  {warnings.length > 0 ? (
                    <>
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>
                        Kết quả trích xuất có {warnings.length} lưu ý (trang
                        scan mờ / bảng-hình khó đọc / nghi thiếu trang) — không
                        tự suy đoán số liệu khuyết.
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>
                        Đã trích xuất rõ {session.extractionReport.totalPages}/
                        {session.extractionReport.totalPages} trang PDF
                        {session.extractionReport.ocrProcessedPages.length > 0
                          ? ` (OCR ${session.extractionReport.ocrProcessedPages.length} trang)`
                          : ""}
                        . Bấm thẻ trang để kiểm chứng trực tiếp.
                      </span>
                    </>
                  )}
                </div>

                {warnings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setWarningsExpanded((v) => !v)}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded border border-amber-300 bg-white px-2 py-0.5 font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    {warningsExpanded ? (
                      <>
                        Thu gọn <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        Chi tiết <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {warningsExpanded && warnings.length > 0 && (
                <ul className="mt-2 space-y-1.5 border-t border-amber-200/80 pt-2">
                  {warnings.map((w) => (
                    <li
                      key={w.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded bg-white/80 px-2.5 py-1.5"
                    >
                      <span>{w.messageVi}</span>
                      <button
                        type="button"
                        onClick={() => handleJumpToPdfPage(w.pdfPage)}
                        className="cursor-pointer font-semibold text-teal-800 underline"
                      >
                        Xem trang PDF {w.pdfPage}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Main Right Content Body across Processing / Error / Complete-Partial */}
          {session.analysis && (mobilePane === "chat" || rightTab === "chat") ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChatPanel
                fileName={session.fileName}
                chatHistory={session.chatHistory}
                pendingQuestion={pendingQuestion}
                currentPdfPage={currentPdfPage}
                citationMap={session.citationMap}
                onSelectCitation={handleSelectCitation}
                onSendQuestion={handleSendQuestion}
                sending={chatSending}
                chatError={chatError}
              />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-20 sm:p-5 lg:pb-5">
              {session.status === "processing" ? (
                <div className="mx-auto my-8 max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-7 w-7 shrink-0 animate-spin text-teal-700" />
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Đang xử lý và phân tích bài báo khoa học...
                      </h2>
                      <p className="text-xs text-slate-500">
                        Bạn có thể xem trước tệp PDF gốc ở khung bên trái trong
                        lúc chờ hệ thống hoàn tất.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex justify-between text-xs font-semibold text-teal-900">
                      <span>{session.progress.stepLabelVi}</span>
                      <span>{session.progress.percent}%</span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        style={{ width: `${session.progress.percent}%` }}
                        className="h-full rounded-full bg-teal-600 transition-all duration-500"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      {session.progress.detailVi}
                    </p>
                  </div>

                  <ol className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                    {[
                      [
                        1,
                        "Kiểm tra cấu trúc PDF & phân biệt trang tệp / trang in",
                      ],
                      [
                        2,
                        "Trích xuất văn bản & chạy Gemini Vision OCR (nếu trang scan)",
                      ],
                      [
                        3,
                        "Tách mục lục, bảng biểu, hình vẽ, công thức & tọa độ dẫn chứng",
                      ],
                      [
                        4,
                        "Phân tích tiếng Việt 3 mức theo lĩnh vực & hậu kiểm dẫn chứng",
                      ],
                    ].map(([stepNum, text]) => {
                      const done = session.progress.step > (stepNum as number);
                      const active = session.progress.step === stepNum;
                      return (
                        <li
                          key={stepNum}
                          className={`flex items-center gap-2 ${
                            active
                              ? "font-semibold text-teal-900"
                              : done
                              ? "text-emerald-700"
                              : "text-slate-400"
                          }`}
                        >
                          <span>{done ? "✓" : active ? "●" : "○"}</span>
                          <span>{text}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : session.status === "error" ? (
                <div className="mx-auto my-8 max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-xs">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Chưa thể hoàn tất phân tích bài báo
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                        {session.errorMessageVi ||
                          "Đã xảy ra lỗi khi xử lý tệp PDF."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => void handleRetryProcessing()}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Thử xử lý lại
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Tải tệp PDF khác
                    </button>
                  </div>
                </div>
              ) : session.analysis ? (
                <ReadingTabsPanel
                  activeTab={rightTab as ReadingModeTab}
                  analysis={session.analysis}
                  sections={session.sections}
                  citationMap={session.citationMap}
                  deepExplanations={session.deepExplanations}
                  selectedSectionId={selectedSectionId}
                  onSelectSectionId={setSelectedSectionId}
                  onRequestDeepRead={handleRequestDeepRead}
                  deepLoading={deepLoading}
                  deepError={deepError}
                  onSelectCitation={handleSelectCitation}
                  onJumpToElement={handleJumpToElement}
                  onJumpToPdfPage={handleJumpToPdfPage}
                />
              ) : null}
            </div>
          )}

          {/* Compact Docked Quick-Ask Bar on Desktop when reading analysis tabs */}
          {session.analysis && rightTab !== "chat" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = quickQuestionInput.trim();
                if (!q || chatSending) return;
                setQuickQuestionInput("");
                void handleSendQuestion(q, null);
              }}
              className="hidden shrink-0 items-center gap-2 border-t border-slate-200 bg-white px-4 py-3 lg:flex"
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-teal-700" />
              <input
                type="text"
                value={quickQuestionInput}
                onChange={(e) => setQuickQuestionInput(e.target.value)}
                placeholder="Nhập câu hỏi bất kỳ về bài báo đang đọc rồi nhấn Enter..."
                className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={!quickQuestionInput.trim() || chatSending}
                className="cursor-pointer rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-45"
              >
                Hỏi
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Mobile Bottom 3-Mode Segmented Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-slate-300 bg-white py-1.5 text-xs font-semibold lg:hidden">
        <button
          type="button"
          onClick={() => {
            setMobilePane("analysis");
            if (rightTab === "chat") setRightTab("quick");
          }}
          className={`flex cursor-pointer flex-col items-center gap-0.5 py-1 ${
            mobilePane === "analysis" ? "text-teal-800" : "text-slate-500"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Phân tích</span>
        </button>

        <button
          type="button"
          onClick={() => setMobilePane("pdf")}
          className={`flex cursor-pointer flex-col items-center gap-0.5 py-1 ${
            mobilePane === "pdf" ? "text-teal-800" : "text-slate-500"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>PDF gốc (tr.{currentPdfPage})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobilePane("chat");
            setRightTab("chat");
          }}
          className={`flex cursor-pointer flex-col items-center gap-0.5 py-1 ${
            mobilePane === "chat" ? "text-teal-800" : "text-slate-500"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>
            Hỏi đáp
            {session.chatHistory.length > 0
              ? ` (${session.chatHistory.length})`
              : ""}
          </span>
        </button>
      </nav>

      {/* Modals */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        session={session}
      />

      <PrivacyModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        hasActiveRealSession={!session.isDemo}
        onDeleteCurrentSession={() => void handleDeleteSession()}
      />
    </div>
  );
}
