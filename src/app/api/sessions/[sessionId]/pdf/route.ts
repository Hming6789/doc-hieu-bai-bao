import { NextRequest, NextResponse } from "next/server";
import { buildSyntheticDemoPdfBuffer } from "@/lib/demo-data";
import { getSessionStore } from "@/lib/session-store";
import { extractSecretFromRequest } from "@/lib/pipeline-runner";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;

  if (sessionId === "demo") {
    const demoPdf = buildSyntheticDemoPdfBuffer();
    return new NextResponse(new Uint8Array(demoPdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="Demo_Minh_Hoa.pdf"',
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const secret = extractSecretFromRequest(req, sessionId);
  const store = getSessionStore();
  const pdfBuffer = store.getPdfBuffer(sessionId, secret);

  if (!pdfBuffer) {
    return NextResponse.json(
      { errorVi: "Không tìm thấy tệp PDF hoặc phiên đã hết hạn / bị xóa." },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
