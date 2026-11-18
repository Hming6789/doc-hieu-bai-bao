"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ListTree,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  DetectedSection,
  PageMapping,
  ResolvedCitation,
} from "@/types/paper";

export interface ActivePdfHighlight {
  pdfPage: number;
  bbox: [number, number, number, number] | null;
  label?: string;
  snippet?: string;
  nonce: number;
}

interface PdfDocumentViewerProps {
  pdfUrl: string;
  sessionSecret: string | null;
  pageMappings: PageMapping[];
  sections: DetectedSection[];
  warningCount: number;
  onShowWarningsClick?: () => void;
  activeHighlight: ActivePdfHighlight | null;
  onCurrentPageChange?: (pdfPage: number) => void;
  onSectionSelect?: (section: DetectedSection) => void;
}

// Lazy client-only PDF.js loader so SSR never evaluates browser canvas globals
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsPromise;
}

interface PdfPageCanvasProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any;
  pageNumber: number;
  printedPage: string | null;
  scale: number;
  highlight: ActivePdfHighlight | null;
  searchMatched: boolean;
  registerPageRef: (pageNum: number, el: HTMLDivElement | null) => void;
}

function PdfPageCanvas({
  pdfDoc,
  pageNumber,
  printedPage,
  scale,
  highlight,
  searchMatched,
  registerPageRef,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState<{ w: number; h: number }>({
    w: Math.round(595 * scale),
    h: Math.round(842 * scale),
  });

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTask: any = null;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale });
        const outputViewport = page.getViewport({ scale: scale * dpr });

        setDimensions({
          w: Math.round(viewport.width),
          h: Math.round(viewport.height),
        });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(outputViewport.width);
        canvas.height = Math.floor(outputViewport.height);
        canvas.style.width = `${Math.round(viewport.width)}px`;
        canvas.style.height = `${Math.round(viewport.height)}px`;

        renderTask = page.render({
          canvasContext: ctx,
          viewport: outputViewport,
        });
        await renderTask.promise;
      } catch {
        // Ignore cancelled render
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
      try {
        renderTask?.cancel?.();
      } catch {
        // Ignore
      }
    };
  }, [pdfDoc, pageNumber, scale]);

  const isHighlightedPage = highlight?.pdfPage === pageNumber;
  const bbox = isHighlightedPage ? highlight?.bbox : null;

  return (
    <div
      ref={(el) => registerPageRef(pageNumber, el)}
      data-pdf-page={pageNumber}
      className="mx-auto mb-5 flex flex-col items-center"
    >
      <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-500">
        <span className="font-medium text-slate-700">
          Trang tệp PDF: {pageNumber}
        </span>
        {printedPage && printedPage !== String(pageNumber) && (
          <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
            Trang in trên bài: {printedPage}
          </span>
        )}
        {searchMatched && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
            Có từ khóa tìm kiếm
          </span>
        )}
      </div>

      <div
        style={{ width: dimensions.w, height: dimensions.h }}
        className={`relative overflow-hidden rounded-lg bg-white shadow-md ring-1 ${
          isHighlightedPage ? "ring-2 ring-amber-500" : "ring-slate-200"
        }`}
      >
        <canvas ref={canvasRef} className="block" />

        {isHighlightedPage && bbox && (
          <div
            key={highlight?.nonce}
            title={
              highlight?.snippet
                ? `Đoạn dẫn chứng gốc:\n"${highlight.snippet}"`
                : "Vùng dẫn chứng được đối chiếu"
            }
            style={{
              left: `${Math.max(0, bbox[0] * 100 - 1)}%`,
              top: `${Math.max(0, bbox[1] * 100 - 0.8)}%`,
              width: `${Math.min(100, (bbox[2] - bbox[0]) * 100 + 2)}%`,
              height: `${Math.min(100, (bbox[3] - bbox[1]) * 100 + 1.6)}%`,
            }}
            className="pdf-citation-highlight pointer-events-auto absolute rounded-md border-2 border-amber-500 bg-amber-300/25"
          >
            <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow-xs">
              Dẫn chứng đang đối chiếu
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PdfDocumentViewer({
  pdfUrl,
  sessionSecret,
  pageMappings,
  sections,
  warningCount,
  onShowWarningsClick,
  activeHighlight,
  onCurrentPageChange,
  onSectionSelect,
}: PdfDocumentViewerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.05);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchedPages, setMatchedPages] = useState<number[]>([]);
  const [pageTexts, setPageTexts] = useState<Record<number, string>>({});

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const registerPageRef = useCallback(
    (pageNum: number, el: HTMLDivElement | null) => {
      if (el) {
        pageRefs.current.set(pageNum, el);
      } else {
        pageRefs.current.delete(pageNum);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function initPdf() {
      try {
        setLoadError(null);
        const pdfjs = await loadPdfJs();
        const headers: Record<string, string> = {};
        if (sessionSecret && sessionSecret !== "demo") {
          headers["x-session-secret"] = sessionSecret;
        }
        const res = await fetch(pdfUrl, { headers });
        if (!res.ok) {
          throw new Error("Không tải được tệp PDF gốc của phiên.");
        }
        const buf = await res.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buf) });
        const loaded = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(loaded);
        setNumPages(loaded.numPages);

        // Extract lightweight searchable text per page for client-side search
        const texts: Record<number, string> = {};
        for (let p = 1; p <= loaded.numPages; p++) {
          const pg = await loaded.getPage(p);
          const tc = await pg.getTextContent();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          texts[p] = tc.items.map((it: any) => it.str || "").join(" ");
        }
        if (!cancelled) {
          setPageTexts(texts);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Không thể hiển thị tệp PDF gốc."
          );
        }
      }
    }
    void initPdf();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl, sessionSecret]);

  // Jump smoothly when user clicks a citation chip!
  const scrollToPdfPage = useCallback(
    (targetPage: number, yRatio?: number | null) => {
      const clamped = Math.max(1, Math.min(numPages || 1, targetPage));
      const pageEl = pageRefs.current.get(clamped);
      const container = scrollContainerRef.current;
      if (pageEl && container) {
        const pageTop = pageEl.offsetTop;
        const extraOffset =
          typeof yRatio === "number"
            ? Math.max(0, yRatio * pageEl.clientHeight - 90)
            : 0;
        container.scrollTo({
          top: Math.max(0, pageTop + extraOffset - 16),
          behavior: "smooth",
        });
        setCurrentPage(clamped);
        onCurrentPageChange?.(clamped);
      }
    },
    [numPages, onCurrentPageChange]
  );

  useEffect(() => {
    if (!activeHighlight || !pdfDoc) return;
    const yTop = activeHighlight.bbox ? activeHighlight.bbox[1] : null;
    const timer = setTimeout(() => {
      scrollToPdfPage(activeHighlight.pdfPage, yTop);
    }, 60);
    return () => clearTimeout(timer);
  }, [activeHighlight, pdfDoc, scrollToPdfPage]);

  // Track visible page on scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const viewMid = container.scrollTop + container.clientHeight * 0.35;
    let bestPage = 1;
    for (const [pNum, el] of pageRefs.current.entries()) {
      if (el.offsetTop <= viewMid) {
        bestPage = pNum;
      }
    }
    if (bestPage !== currentPage) {
      setCurrentPage(bestPage);
      onCurrentPageChange?.(bestPage);
    }
  }, [currentPage, onCurrentPageChange]);

  // Search inside PDF
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setMatchedPages([]);
      return;
    }
    const hits: number[] = [];
    for (let p = 1; p <= numPages; p++) {
      if ((pageTexts[p] || "").toLowerCase().includes(q)) {
        hits.push(p);
      }
    }
    setMatchedPages(hits);
    if (hits.length > 0) {
      scrollToPdfPage(hits[0]);
    }
  }, [searchQuery, numPages, pageTexts, scrollToPdfPage]);

  const currentMapping = pageMappings.find((m) => m.pdfPage === currentPage);
  const printedLabel = currentMapping?.printedPage;

  return (
    <div className="flex h-full flex-col bg-slate-200/70">
      {/* PDF Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-white px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {sections.length > 0 && (
            <div className="relative flex items-center">
              <ListTree className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-slate-500" />
              <select
                aria-label="Mục lục PDF"
                value=""
                onChange={(e) => {
                  const sec = sections.find(
                    (s) => s.sectionId === e.target.value
                  );
                  if (sec) {
                    scrollToPdfPage(sec.startPdfPage);
                    onSectionSelect?.(sec);
                  }
                }}
                className="max-w-[165px] cursor-pointer truncate rounded-md border border-slate-300 bg-slate-50 py-1 pr-2 pl-7 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <option value="" disabled>
                  Mục lục ({sections.length})
                </option>
                {sections.map((sec) => (
                  <option key={sec.sectionId} value={sec.sectionId}>
                    tr.{sec.startPdfPage} — {sec.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center rounded-md border border-slate-300 bg-slate-50">
            <button
              type="button"
              onClick={() => scrollToPdfPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="cursor-pointer p-1 text-slate-600 hover:text-slate-900 disabled:opacity-40"
              title="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-medium text-slate-800">
              Tệp: {currentPage}/{numPages || pageMappings.length || "?"}
              {printedLabel && printedLabel !== String(currentPage) && (
                <span className="ml-1 text-teal-800">(In: {printedLabel})</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => scrollToPdfPage(currentPage + 1)}
              disabled={numPages > 0 && currentPage >= numPages}
              className="cursor-pointer p-1 text-slate-600 hover:text-slate-900 disabled:opacity-40"
              title="Trang tiếp"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-md border border-slate-300 bg-slate-50">
            <button
              type="button"
              onClick={() =>
                setScale((s) => Math.max(0.65, Number((s - 0.15).toFixed(2))))
              }
              className="cursor-pointer p-1 text-slate-600 hover:text-slate-900"
              title="Thu nhỏ"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setScale(1.05)}
              className="cursor-pointer px-1.5 font-medium text-slate-700 hover:text-slate-900"
              title="Đặt lại 100%"
            >
              {Math.round((scale / 1.05) * 100)}%
            </button>
            <button
              type="button"
              onClick={() =>
                setScale((s) => Math.min(2.2, Number((s + 0.15).toFixed(2))))
              }
              className="cursor-pointer p-1 text-slate-600 hover:text-slate-900"
              title="Phóng to"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 font-medium transition ${
              showSearch
                ? "border-teal-500 bg-teal-50 text-teal-800"
                : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
            title="Tìm chữ tiếng Anh trong PDF"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tìm</span>
          </button>

          {warningCount > 0 && (
            <button
              type="button"
              onClick={onShowWarningsClick}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 font-medium text-amber-900 hover:bg-amber-100"
              title="Xem cảnh báo trích xuất / OCR"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>{warningCount} lưu ý</span>
            </button>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="flex items-center gap-2 border-b border-slate-300 bg-slate-50 px-3 py-1.5 text-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nhập từ khóa tiếng Anh hoặc con số cần tìm trên PDF..."
            className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-teal-600 focus:outline-none"
          />
          {searchQuery.trim() && (
            <span className="text-slate-600">
              {matchedPages.length > 0
                ? `Thấy ở trang: ${matchedPages.join(", ")}`
                : "Không khớp"}
            </span>
          )}
        </div>
      )}

      {/* Scrollable Pages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-auto p-4"
      >
        {loadError ? (
          <div className="mx-auto mt-10 max-w-md rounded-xl border border-red-200 bg-white p-5 text-center text-sm text-red-700 shadow-xs">
            {loadError}
          </div>
        ) : !pdfDoc ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-600">
            Đang dựng bản PDF gốc để đối chiếu...
          </div>
        ) : (
          Array.from({ length: numPages }, (_, idx) => {
            const pNum = idx + 1;
            const pm = pageMappings.find((m) => m.pdfPage === pNum);
            return (
              <PdfPageCanvas
                key={pNum}
                pdfDoc={pdfDoc}
                pageNumber={pNum}
                printedPage={pm?.printedPage ?? null}
                scale={scale}
                highlight={activeHighlight}
                searchMatched={matchedPages.includes(pNum)}
                registerPageRef={registerPageRef}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// Helper converter from ResolvedCitation to ActivePdfHighlight
export function citationToHighlight(
  anchor: ResolvedCitation
): ActivePdfHighlight {
  return {
    pdfPage: anchor.pdfPage,
    bbox: anchor.bbox,
    label: anchor.sectionTitle ?? undefined,
    snippet: anchor.snippet,
    nonce: Date.now(),
  };
}
