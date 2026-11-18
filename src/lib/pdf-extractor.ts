import * as mupdf from "mupdf";
import { MAX_PDF_BYTES, MAX_PDF_PAGES } from "./env-config.ts";
import type {
  DetectedSection,
  DocumentChunk,
  ExtractionReport,
  ExtractionWarning,
  NormalizedBBox,
  PageMapping,
  ResolvedCitation,
} from "../types/paper.ts";

export class PdfValidationError extends Error {
  public readonly userMessageVi: string;
  constructor(userMessageVi: string) {
    super(userMessageVi);
    this.name = "PdfValidationError";
    this.userMessageVi = userMessageVi;
  }
}

interface MuPdfLine {
  bbox: { x: number; y: number; w: number; h: number };
  font?: { name?: string; size?: number; weight?: string };
  text: string;
}

interface MuPdfBlock {
  type: "text" | "image";
  bbox: { x: number; y: number; w: number; h: number };
  lines?: MuPdfLine[];
}

export interface VisionOcrPageOutput {
  blocks: {
    text: string;
    approxRegion: "top" | "upper_middle" | "lower_middle" | "bottom" | "full";
  }[];
  printedPageNumber: string | null;
  unreadableWarningsVi: string[];
}

export type VisionOcrHandler = (params: {
  pdfPage: number;
  totalPages: number;
  pngBase64: string;
}) => Promise<VisionOcrPageOutput>;

function clamp01(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(1, Number(val.toFixed(4))));
}

function toNormalizedBBox(
  bbox: { x: number; y: number; w: number; h: number },
  pageW: number,
  pageH: number
): NormalizedBBox {
  const safeW = pageW > 0 ? pageW : 612;
  const safeH = pageH > 0 ? pageH : 792;
  return [
    clamp01(bbox.x / safeW),
    clamp01(bbox.y / safeH),
    clamp01((bbox.x + bbox.w) / safeW),
    clamp01((bbox.y + bbox.h) / safeH),
  ];
}

function approxRegionToBBox(
  region: VisionOcrPageOutput["blocks"][number]["approxRegion"]
): NormalizedBBox {
  switch (region) {
    case "top":
      return [0.06, 0.06, 0.94, 0.3];
    case "upper_middle":
      return [0.06, 0.26, 0.94, 0.54];
    case "lower_middle":
      return [0.06, 0.5, 0.94, 0.78];
    case "bottom":
      return [0.06, 0.72, 0.94, 0.95];
    default:
      return [0.05, 0.05, 0.95, 0.95];
  }
}

function extractCandidatePageNumber(lineText: string): number | null {
  const cleaned = lineText.trim();
  if (!cleaned || cleaned.length > 48) return null;

  // Match standalone digits: "312", "- 312 -", "Page 312", "p. 312"
  const direct = cleaned.match(
    /^(?:[-–—\s]*(?:page|p\.)?\s*)(\d{1,5})(?:\s*[-–—]*)$/i
  );
  if (direct) {
    const num = Number(direct[1]);
    if (num > 0 && num < 50000) return num;
  }

  // Match journal header/footer ending or starting with page number separated by | or spaces
  const edgePipe = cleaned.match(/^(?:(\d{1,5})\s*\|\s*.+|.+\|\s*(\d{1,5}))$/);
  if (edgePipe) {
    const num = Number(edgePipe[1] || edgePipe[2]);
    if (num > 0 && num < 50000 && (num < 1900 || num > 2035)) return num;
  }

  return null;
}

function computeGarbledRatio(text: string): number {
  if (!text) return 0;
  let bad = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (
      code === 0xfffd ||
      (code < 32 && code !== 9 && code !== 10 && code !== 13)
    ) {
      bad++;
    }
  }
  return bad / text.length;
}

const SECTION_HEADING_REGEX =
  /^(?:abstract|introduction|background|related\s+work|materials?\s+and\s+methods?|methodology|methods?|proposed\s+method|experimental\s+setup|experiments?|case\s+study|study\s+area|results?(?:\s+and\s+discussion)?|discussion|limitations?|conclusions?|acknowledg(?:e)?ments?|references|appendix|(?:[1-9]\d?(?:\.[1-9]\d?){0,2}|[IVX]{1,4})\.?\s+[A-Z][A-Za-z0-9\s,\-–—/:()]{2,85})$/i;

function looksLikeSectionHeading(
  blockText: string,
  maxFontSizeInBlock: number,
  medianBodyFontSize: number
): boolean {
  const singleLine = blockText.replace(/\s+/g, " ").trim();
  if (singleLine.length < 3 || singleLine.length > 100) return false;
  if (/[.;]$/.test(singleLine) && !/et al\.$/i.test(singleLine)) return false;

  if (SECTION_HEADING_REGEX.test(singleLine)) {
    return true;
  }
  if (
    maxFontSizeInBlock >= medianBodyFontSize * 1.16 &&
    /^[A-Z0-9]/.test(singleLine) &&
    singleLine.split(" ").length <= 12
  ) {
    return true;
  }
  return false;
}

export function renderPdfPageToPngBase64(
  pdfBuffer: Buffer | Uint8Array,
  pdfPage: number,
  scale: number = 2.0
): string {
  const bytes =
    pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  const count = doc.countPages();
  const pageIdx = Math.max(0, Math.min(count - 1, pdfPage - 1));
  const page = doc.loadPage(pageIdx);
  const pixmap = page.toPixmap(
    mupdf.Matrix.scale(scale, scale),
    mupdf.ColorSpace.DeviceRGB,
    false,
    true
  );
  const pngBytes = pixmap.asPNG();
  return Buffer.from(pngBytes).toString("base64");
}

export interface ExtractedDocumentBundle {
  pageMappings: PageMapping[];
  chunks: DocumentChunk[];
  citationMap: Record<string, ResolvedCitation>;
  sections: DetectedSection[];
  report: ExtractionReport;
}

export async function extractPdfDocument(params: {
  pdfBuffer: Buffer;
  ocrHandler?: VisionOcrHandler;
  onProgress?: (detailVi: string, percent: number, step: 1 | 2 | 3) => void;
}): Promise<ExtractedDocumentBundle> {
  const { pdfBuffer, ocrHandler, onProgress } = params;

  if (!pdfBuffer || pdfBuffer.byteLength < 32) {
    throw new PdfValidationError(
      "Tệp tải lên trống hoặc không hợp lệ. Vui lòng chọn tệp PDF bài báo khoa học."
    );
  }
  if (pdfBuffer.byteLength > MAX_PDF_BYTES) {
    throw new PdfValidationError(
      `Dung lượng tệp vượt ngưỡng hỗ trợ (${Math.round(
        MAX_PDF_BYTES / (1024 * 1024)
      )} MB). Vui lòng tải bài báo PDF dung lượng nhỏ hơn.`
    );
  }

  const headerSlice = pdfBuffer.subarray(0, 1024).toString("latin1");
  if (!headerSlice.includes("%PDF-")) {
    throw new PdfValidationError(
      "Định dạng tệp không phải PDF chuẩn. Vui lòng kiểm tra lại tệp đầu vào."
    );
  }

  let doc: mupdf.Document;
  try {
    doc = mupdf.Document.openDocument(
      new Uint8Array(pdfBuffer),
      "application/pdf"
    );
  } catch {
    throw new PdfValidationError(
      "Không thể mở tệp PDF do cấu trúc tệp bị hỏng hoặc lỗi mã hóa."
    );
  }

  if (doc.needsPassword()) {
    throw new PdfValidationError(
      "Tệp PDF đang được đặt mật khẩu bảo vệ. Vui lòng gỡ mật khẩu tệp trước khi tải lên."
    );
  }

  const totalPages = doc.countPages();
  if (totalPages <= 0) {
    throw new PdfValidationError("Tệp PDF không có trang nội dung nào.");
  }
  if (totalPages > MAX_PDF_PAGES) {
    throw new PdfValidationError(
      `Tệp có ${totalPages} trang, vượt phạm vi bài báo tiêu chuẩn (tối đa ${MAX_PDF_PAGES} trang). Vui lòng trích riêng bài báo hoặc chương cần đọc.`
    );
  }

  onProgress?.(
    `Đã kiểm tra tệp (${totalPages} trang). Đang trích xuất cấu trúc văn bản & tọa độ...`,
    15,
    1
  );

  interface RawPageParse {
    pdfPage: number;
    widthPt: number;
    heightPt: number;
    textBlocks: {
      bbox: NormalizedBBox;
      rawYRatio: number;
      text: string;
      maxFontSize: number;
    }[];
    imageBoxes: NormalizedBBox[];
    candidatePrintedNums: number[];
    charCount: number;
    garbledRatio: number;
    needsOcr: boolean;
  }

  const rawPages: RawPageParse[] = [];
  const allFontSizes: number[] = [];

  for (let i = 0; i < totalPages; i++) {
    const pdfPage = i + 1;
    const page = doc.loadPage(i);
    const bounds = page.getBounds(); // [x0, y0, x1, y1]
    const widthPt = Math.max(1, bounds[2] - bounds[0]);
    const heightPt = Math.max(1, bounds[3] - bounds[1]);

    const stextJson = JSON.parse(
      page.toStructuredText("preserve-whitespace").asJSON()
    ) as { blocks?: MuPdfBlock[] };

    const textBlocks: RawPageParse["textBlocks"] = [];
    const imageBoxes: NormalizedBBox[] = [];
    const candidatePrintedNums: number[] = [];
    let fullPageChars = "";

    for (const blk of stextJson.blocks ?? []) {
      if (blk.type === "image") {
        const norm = toNormalizedBBox(blk.bbox, widthPt, heightPt);
        const area = (norm[2] - norm[0]) * (norm[3] - norm[1]);
        if (area >= 0.015) {
          imageBoxes.push(norm);
        }
        continue;
      }

      if (blk.type === "text" && blk.lines && blk.lines.length > 0) {
        let maxFontSize = 10;
        const lineStrings: string[] = [];
        for (const ln of blk.lines) {
          const sz = ln.font?.size ?? 10;
          if (sz > maxFontSize) maxFontSize = sz;
          if (ln.text?.trim()) {
            allFontSizes.push(sz);
            lineStrings.push(ln.text.trim());
          }
        }

        const joined = lineStrings.join(" ").replace(/\s+/g, " ").trim();
        if (!joined) continue;

        const normBBox = toNormalizedBBox(blk.bbox, widthPt, heightPt);
        const yCenter = (normBBox[1] + normBBox[3]) / 2;

        // Check top 9% or bottom 9% for printed page numbers
        if (yCenter <= 0.095 || yCenter >= 0.905) {
          for (const ln of blk.lines) {
            const cand = extractCandidatePageNumber(ln.text || "");
            if (cand !== null) {
              candidatePrintedNums.push(cand);
            }
          }
        }

        fullPageChars += joined + "\n";
        textBlocks.push({
          bbox: normBBox,
          rawYRatio: yCenter,
          text: joined,
          maxFontSize,
        });
      }
    }

    const charCount = fullPageChars.trim().length;
    const garbledRatio = computeGarbledRatio(fullPageChars);
    const needsOcr = charCount < 120 || garbledRatio > 0.035;

    rawPages.push({
      pdfPage,
      widthPt,
      heightPt,
      textBlocks,
      imageBoxes,
      candidatePrintedNums,
      charCount,
      garbledRatio,
      needsOcr,
    });
  }

  // Infer printed page sequence (`printed_page = offset + pdfPage`) or explicit per-page numbers
  const offsetVotes = new Map<number, number>();
  for (const rp of rawPages) {
    const uniqueCands = new Set(rp.candidatePrintedNums);
    for (const num of uniqueCands) {
      const offset = num - rp.pdfPage;
      offsetVotes.set(offset, (offsetVotes.get(offset) ?? 0) + 1);
    }
  }

  let dominantOffset: number | null = null;
  let bestVoteCount = 0;
  for (const [offset, votes] of offsetVotes.entries()) {
    if (votes > bestVoteCount) {
      bestVoteCount = votes;
      dominantOffset = offset;
    }
  }

  const resolvedPrintedPages = new Map<number, number>();
  if (dominantOffset !== null && bestVoteCount >= Math.min(2, totalPages)) {
    for (const rp of rawPages) {
      const expected = rp.pdfPage + dominantOffset;
      if (rp.candidatePrintedNums.includes(expected)) {
        resolvedPrintedPages.set(rp.pdfPage, expected);
      } else if (rp.candidatePrintedNums.length === 1) {
        resolvedPrintedPages.set(rp.pdfPage, rp.candidatePrintedNums[0]);
      } else if (expected > 0) {
        resolvedPrintedPages.set(rp.pdfPage, expected);
      }
    }
  }

  // Check for printed page jumps (missing pages in scanned/cropped PDFs!)
  const missingPrintedPageGaps: string[] = [];
  for (let i = 1; i < rawPages.length; i++) {
    const prevPdf = rawPages[i - 1].pdfPage;
    const currPdf = rawPages[i].pdfPage;
    const prevCands = rawPages[i - 1].candidatePrintedNums;
    const currCands = rawPages[i].candidatePrintedNums;
    if (prevCands.length === 1 && currCands.length === 1) {
      const diff = currCands[0] - prevCands[0];
      if (diff > 1 && diff < 25) {
        resolvedPrintedPages.set(prevPdf, prevCands[0]);
        resolvedPrintedPages.set(currPdf, currCands[0]);
        missingPrintedPageGaps.push(
          `Số trang in nhảy từ ${prevCands[0]} sang ${currCands[0]} (giữa trang tệp PDF ${prevPdf} và ${currPdf}) — có thể tệp PDF bị thiếu trang.`
        );
      }
    }
  }

  const warnings: ExtractionWarning[] = missingPrintedPageGaps.map(
    (msg, idx) => ({
      id: `gap-${idx + 1}`,
      pdfPage: 1,
      printedPage: null,
      severity: "degraded",
      messageVi: msg,
    })
  );

  // Median font size for heading detection
  const sortedFonts = [...allFontSizes].sort((a, b) => a - b);
  const medianFontSize =
    sortedFonts.length > 0
      ? sortedFonts[Math.floor(sortedFonts.length / 2)]
      : 10;

  const textExtractedPages: number[] = [];
  const ocrProcessedPages: number[] = [];
  const pageMappings: PageMapping[] = [];
  const chunks: DocumentChunk[] = [];
  const sections: DetectedSection[] = [];

  let currentSectionTitle: string | null = "Mở đầu / Tiêu đề & Tóm tắt";
  let currentSection: DetectedSection = {
    sectionId: "SEC-01",
    title: currentSectionTitle,
    startPdfPage: 1,
    endPdfPage: 1,
    printedPageStart: resolvedPrintedPages.has(1)
      ? String(resolvedPrintedPages.get(1))
      : null,
    chunkIds: [],
  };
  sections.push(currentSection);

  for (const rp of rawPages) {
    let printedStr = resolvedPrintedPages.has(rp.pdfPage)
      ? String(resolvedPrintedPages.get(rp.pdfPage))
      : null;

    let usedOcr = false;

    if (rp.needsOcr && ocrHandler) {
      onProgress?.(
        `Đang nhận diện OCR (Gemini Vision) cho trang ${rp.pdfPage}/${totalPages}...`,
        18 + Math.round((rp.pdfPage / totalPages) * 28),
        2
      );
      try {
        const pngBase64 = renderPdfPageToPngBase64(pdfBuffer, rp.pdfPage, 2.0);
        const ocrRes = await ocrHandler({
          pdfPage: rp.pdfPage,
          totalPages,
          pngBase64,
        });
        usedOcr = true;
        ocrProcessedPages.push(rp.pdfPage);

        if (!printedStr && ocrRes.printedPageNumber) {
          printedStr = ocrRes.printedPageNumber;
        }

        for (const w of ocrRes.unreadableWarningsVi ?? []) {
          if (w.trim()) {
            warnings.push({
              id: `ocr-warn-p${rp.pdfPage}-${warnings.length + 1}`,
              pdfPage: rp.pdfPage,
              printedPage: printedStr,
              severity: "warning",
              messageVi: w.trim(),
            });
          }
        }

        let blockIdx = 0;
        for (const ob of ocrRes.blocks ?? []) {
          const text = ob.text?.trim();
          if (!text) continue;
          blockIdx++;
          const chunkId = `P${String(rp.pdfPage).padStart(2, "0")}-B${String(
            blockIdx
          ).padStart(2, "0")}`;

          if (
            looksLikeSectionHeading(
              text.split("\n")[0] ?? text,
              medianFontSize * 1.2,
              medianFontSize
            ) &&
            text.length <= 100
          ) {
            currentSectionTitle = text;
            currentSection = {
              sectionId: `SEC-${String(sections.length + 1).padStart(2, "0")}`,
              title: currentSectionTitle,
              startPdfPage: rp.pdfPage,
              endPdfPage: rp.pdfPage,
              printedPageStart: printedStr,
              chunkIds: [],
            };
            sections.push(currentSection);
          }

          currentSection.endPdfPage = rp.pdfPage;
          currentSection.chunkIds.push(chunkId);

          chunks.push({
            chunkId,
            pdfPage: rp.pdfPage,
            printedPage: printedStr,
            sectionTitle: currentSectionTitle,
            bbox: approxRegionToBBox(ob.approxRegion),
            text,
            source: "vision_ocr",
          });
        }

        if ((ocrRes.blocks ?? []).length === 0 && rp.charCount < 30) {
          warnings.push({
            id: `empty-ocr-p${rp.pdfPage}`,
            pdfPage: rp.pdfPage,
            printedPage: printedStr,
            severity: "degraded",
            messageVi: `Trang PDF ${rp.pdfPage} là ảnh quét mờ hoặc trang hình không nhận diện được chữ.`,
          });
        }
      } catch {
        warnings.push({
          id: `ocr-fail-p${rp.pdfPage}`,
          pdfPage: rp.pdfPage,
          printedPage: printedStr,
          severity: "degraded",
          messageVi: `Không thể chạy OCR đầy đủ trên trang PDF ${rp.pdfPage}; chỉ giữ phần văn bản thô trích xuất được.`,
        });
      }
    }

    if (!usedOcr) {
      if (rp.needsOcr) {
        warnings.push({
          id: `low-text-p${rp.pdfPage}`,
          pdfPage: rp.pdfPage,
          printedPage: printedStr,
          severity: rp.charCount < 30 ? "degraded" : "warning",
          messageVi:
            rp.garbledRatio > 0.035
              ? `Trang PDF ${rp.pdfPage} có ký tự công thức/bảng mã đặc biệt khó giải mã trực tiếp — hãy đối chiếu ảnh gốc khi đọc công thức.`
              : `Trang PDF ${rp.pdfPage} có rất ít lớp văn bản (${rp.charCount} ký tự, có thể là trang scan hoặc hình vẽ lớn).`,
        });
      } else {
        textExtractedPages.push(rp.pdfPage);
      }

      let blockCounter = 0;
      for (const blk of rp.textBlocks) {
        // Skip tiny standalone page number headers/footers from polluting content chunks
        if (
          (blk.rawYRatio <= 0.08 || blk.rawYRatio >= 0.92) &&
          blk.text.length <= 12 &&
          extractCandidatePageNumber(blk.text) !== null
        ) {
          continue;
        }

        if (
          looksLikeSectionHeading(blk.text, blk.maxFontSize, medianFontSize)
        ) {
          currentSectionTitle = blk.text;
          if (
            currentSection.chunkIds.length === 0 &&
            sections.length === 1 &&
            rp.pdfPage === 1
          ) {
            currentSection.title = currentSectionTitle;
          } else {
            currentSection = {
              sectionId: `SEC-${String(sections.length + 1).padStart(2, "0")}`,
              title: currentSectionTitle,
              startPdfPage: rp.pdfPage,
              endPdfPage: rp.pdfPage,
              printedPageStart: printedStr,
              chunkIds: [],
            };
            sections.push(currentSection);
          }
        }

        blockCounter++;
        const chunkId = `P${String(rp.pdfPage).padStart(2, "0")}-B${String(
          blockCounter
        ).padStart(2, "0")}`;

        currentSection.endPdfPage = rp.pdfPage;
        currentSection.chunkIds.push(chunkId);

        chunks.push({
          chunkId,
          pdfPage: rp.pdfPage,
          printedPage: printedStr,
          sectionTitle: currentSectionTitle,
          bbox: blk.bbox,
          text: blk.text,
          source: "pdf_text",
        });
      }
    }

    pageMappings.push({
      pdfPage: rp.pdfPage,
      printedPage: printedStr,
      widthPt: Math.round(rp.widthPt),
      heightPt: Math.round(rp.heightPt),
      usedOcr,
      imageCount: rp.imageBoxes.length,
      charCount: rp.charCount,
    });
  }

  if (chunks.length === 0) {
    throw new PdfValidationError(
      "Không trích xuất được bất kỳ văn bản đọc được nào từ tệp PDF này (tệp trống hoặc ảnh scan quá mờ)."
    );
  }

  const nonEmptySections = sections.filter((s) => s.chunkIds.length > 0);
  const finalSections =
    nonEmptySections.length > 0 ? nonEmptySections : sections;

  const citationMap: Record<string, ResolvedCitation> = {};
  for (const ch of chunks) {
    citationMap[ch.chunkId] = {
      chunkId: ch.chunkId,
      pdfPage: ch.pdfPage,
      printedPage: ch.printedPage,
      sectionTitle: ch.sectionTitle,
      bbox: ch.bbox,
      snippet: ch.text.length > 260 ? ch.text.slice(0, 257) + "..." : ch.text,
    };
  }

  const hasDistinctPrintedPages = pageMappings.some(
    (pm) => pm.printedPage !== null && pm.printedPage !== String(pm.pdfPage)
  );

  const report: ExtractionReport = {
    totalPages,
    fileSizeBytes: pdfBuffer.byteLength,
    textExtractedPages,
    ocrProcessedPages,
    hasDistinctPrintedPages,
    missingPrintedPageGaps,
    warnings,
    qualityStatus: warnings.length > 0 ? "partial" : "complete",
  };

  return {
    pageMappings,
    chunks,
    citationMap,
    sections: finalSections,
    report,
  };
}
