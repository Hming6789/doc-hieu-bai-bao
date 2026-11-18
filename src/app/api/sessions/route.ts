import { NextRequest, NextResponse } from "next/server";
import * as mupdf from "mupdf";
import {
  getSessionTtlHours,
  MAX_PDF_BYTES,
  MAX_PDF_PAGES,
} from "@/lib/env-config";
import { getSessionStore } from "@/lib/session-store";
import { runSessionProcessingPipeline } from "@/lib/pipeline-runner";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { errorVi: "Vui lòng chọn một tệp PDF tiếng Anh để tải lên." },
        { status: 400 }
      );
    }

    const fileName = file.name || "Bai_bao_khoa_hoc.pdf";
    if (!fileName.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json(
        {
          errorVi:
            "Hệ thống chỉ nhận tệp định dạng PDF (.pdf). Vui lòng kiểm tra lại tệp đã chọn.",
        },
        { status: 400 }
      );
    }

    if (file.size <= 32) {
      return NextResponse.json(
        { errorVi: "Tệp PDF trống hoặc bị lỗi dung lượng (0 byte)." },
        { status: 400 }
      );
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        {
          errorVi: `Dung lượng tệp (${(file.size / (1024 * 1024)).toFixed(
            1
          )} MB) vượt ngưỡng hỗ trợ tối đa ${Math.round(
            MAX_PDF_BYTES / (1024 * 1024)
          )} MB.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    const headerStr = pdfBuffer.subarray(0, 1024).toString("latin1");
    if (!headerStr.includes("%PDF-")) {
      return NextResponse.json(
        {
          errorVi:
            "Tệp tải lên không có cấu trúc PDF hợp lệ. Vui lòng chọn đúng tệp bài báo PDF.",
        },
        { status: 400 }
      );
    }

    // Fast pre-check for corruption, password protection, or page count > 50
    try {
      const doc = mupdf.Document.openDocument(
        new Uint8Array(pdfBuffer),
        "application/pdf"
      );
      if (doc.needsPassword()) {
        return NextResponse.json(
          {
            errorVi:
              "Tệp PDF này đang được đặt mật khẩu bảo vệ. Vui lòng gỡ mật khẩu tệp trước khi tải lên.",
          },
          { status: 400 }
        );
      }
      const pages = doc.countPages();
      if (pages <= 0) {
        return NextResponse.json(
          { errorVi: "Tệp PDF không có trang nội dung nào." },
          { status: 400 }
        );
      }
      if (pages > MAX_PDF_PAGES) {
        return NextResponse.json(
          {
            errorVi: `Tệp có ${pages} trang, vượt phạm vi bài báo khoa học tiêu chuẩn (tối đa ${MAX_PDF_PAGES} trang). Vui lòng tách riêng bài báo cần đọc.`,
          },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        {
          errorVi:
            "Tệp PDF bị lỗi cấu trúc hoặc hỏng dữ liệu không thể đọc được.",
        },
        { status: 400 }
      );
    }

    const store = getSessionStore();
    const { sessionId, sessionSecret, payload } = store.createSession(
      fileName,
      pdfBuffer
    );

    // Kick off async background extraction + OCR + OpenAI analysis
    void runSessionProcessingPipeline(sessionId);

    const ttlSeconds = Math.round(getSessionTtlHours() * 3600);
    const res = NextResponse.json(
      { sessionId, sessionSecret, payload },
      {
        status: 201,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      }
    );

    res.cookies.set(`ps_${sessionId}`, sessionSecret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ttlSeconds,
      path: "/",
    });

    return res;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Lỗi không xác định khi tải tệp.";
    return NextResponse.json(
      { errorVi: `Không thể tiếp nhận tệp PDF: ${message}` },
      { status: 500 }
    );
  }
}
