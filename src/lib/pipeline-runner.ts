import type { NextRequest } from "next/server";
import { getSessionStore } from "./session-store.ts";
import { extractPdfDocument, PdfValidationError } from "./pdf-extractor.ts";
import {
  analyzeScientificPaper,
  MissingApiKeyError,
  runVisionOcrForPage,
} from "./gemini-analyzer.ts";
import { getGeminiApiKey } from "./env-config.ts";

export function extractSecretFromRequest(
  req: NextRequest,
  sessionId: string
): string | null {
  const fromHeader = req.headers.get("x-session-secret")?.trim();
  if (fromHeader) return fromHeader;

  const fromQuery = req.nextUrl.searchParams.get("token")?.trim();
  if (fromQuery) return fromQuery;

  const cookieName = `ps_${sessionId}`;
  const fromCookie = req.cookies.get(cookieName)?.value?.trim();
  if (fromCookie) return fromCookie;

  return null;
}

const activeJobs = new Set<string>();

export async function runSessionProcessingPipeline(
  sessionId: string
): Promise<void> {
  if (activeJobs.has(sessionId)) return;
  activeJobs.add(sessionId);

  const store = getSessionStore();
  try {
    const pdfBuffer = store.getPdfBufferInternal(sessionId);
    if (!pdfBuffer) {
      throw new Error("Không tìm thấy tệp PDF gốc của phiên làm việc.");
    }

    const hasApiKey = Boolean(getGeminiApiKey());

    store.updateProgressInternal(sessionId, {
      step: 1,
      stepLabelVi: "1/4 • Kiểm tra cấu trúc tệp & đánh số trang",
      detailVi:
        "Đang phân tích bố cục PDF, ánh xạ số trang tệp PDF với số trang in...",
      percent: 12,
    });

    const bundle = await extractPdfDocument({
      pdfBuffer,
      ocrHandler: hasApiKey ? runVisionOcrForPage : undefined,
      onProgress: (detailVi, percent, step) => {
        const stepLabels: Record<1 | 2 | 3, string> = {
          1: "1/4 • Kiểm tra cấu trúc tệp & đánh số trang",
          2: "2/4 • Nhận diện OCR (Gemini Vision) cho trang scan/ảnh",
          3: "3/4 • Tách mục lục, bảng biểu, hình vẽ & công thức",
        };
        store.updateProgressInternal(sessionId, {
          step,
          stepLabelVi: stepLabels[step],
          detailVi,
          percent,
        });
      },
    });

    store.saveChunksInternal(sessionId, bundle.chunks);
    store.updateSessionInternal(sessionId, (draft) => {
      draft.pageMappings = bundle.pageMappings;
      draft.sections = bundle.sections;
      draft.extractionReport = bundle.report;
      draft.citationMap = bundle.citationMap;
      draft.progress = {
        step: 3,
        stepLabelVi: "3/4 • Đã trích xuất văn bản & tọa độ dẫn chứng",
        detailVi: `Trích xuất thành công ${bundle.chunks.length} đoạn trên ${bundle.report.totalPages} trang. Chuẩn bị phân tích qua Google Gemini API...`,
        percent: 48,
      };
    });

    if (!hasApiKey) {
      throw new MissingApiKeyError();
    }

    const analysis = await analyzeScientificPaper({
      pdfBuffer,
      chunks: bundle.chunks,
      pageMappings: bundle.pageMappings,
      citationMap: bundle.citationMap,
      report: bundle.report,
      onProgress: (detailVi, percent) => {
        store.updateProgressInternal(sessionId, {
          step: 4,
          stepLabelVi:
            "4/4 • Phân tích tiếng Việt theo lĩnh vực & kiểm tra dẫn chứng",
          detailVi,
          percent,
        });
      },
    });

    store.updateSessionInternal(sessionId, (draft) => {
      draft.analysis = analysis;
      draft.errorMessageVi = null;
      const hasUnreadableVisual = analysis.visualElements.some(
        (v) => !v.readable
      );
      draft.status =
        bundle.report.qualityStatus === "partial" || hasUnreadableVisual
          ? "partial"
          : "complete";
      draft.progress = {
        step: 4,
        stepLabelVi: "Hoàn tất xử lý tài liệu",
        detailVi: "Đã sẵn sàng đọc hiểu 3 mức và đối chiếu dẫn chứng.",
        percent: 100,
      };
    });
  } catch (err) {
    let userMsg =
      "Đã xảy ra lỗi trong quá trình xử lý bài báo. Vui lòng kiểm tra kết nối hoặc thử lại.";
    if (err instanceof PdfValidationError || err instanceof MissingApiKeyError) {
      userMsg = err.userMessageVi;
    } else if (err instanceof Error && err.message) {
      if (
        err.message.includes("API_KEY_INVALID") ||
        err.message.includes("API key not valid") ||
        err.message.includes("400") && err.message.toLowerCase().includes("key")
      ) {
        userMsg =
          "Khóa GEMINI_API_KEY không hợp lệ. Vui lòng kiểm tra lại mã khóa lấy từ Google AI Studio (bắt đầu bằng AIzaSy...).";
      } else if (
        err.message.includes("429") ||
        err.message.includes("RESOURCE_EXHAUSTED")
      ) {
        userMsg =
          "Khóa Gemini API tạm thời chạm giới hạn tần suất theo phút của gói miễn phí Google AI Studio. Vui lòng đợi khoảng 30–60 giây rồi bấm Thử xử lý lại.";
      } else if (
        err.message.includes("503") ||
        err.message.includes("UNAVAILABLE")
      ) {
        userMsg =
          "Các máy chủ mô hình Gemini hiện đang quá tải tạm thời (503). Vui lòng bấm Thử xử lý lại sau vài giây.";
      } else {
        userMsg = `Lỗi xử lý tài liệu: ${err.message}`;
      }
    }

    store.updateSessionInternal(sessionId, (draft) => {
      draft.status = "error";
      draft.errorMessageVi = userMsg;
    });
  } finally {
    activeJobs.delete(sessionId);
  }
}
