import { NextRequest, NextResponse } from "next/server";
import { getDemoSessionPayload } from "@/lib/demo-data";
import { getSessionStore } from "@/lib/session-store";
import {
  extractSecretFromRequest,
  runSessionProcessingPipeline,
} from "@/lib/pipeline-runner";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;

  if (sessionId === "demo") {
    return NextResponse.json(
      { payload: getDemoSessionPayload() },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      }
    );
  }

  const secret = extractSecretFromRequest(req, sessionId);
  const store = getSessionStore();
  const payload = store.getSession(sessionId, secret);

  if (!payload) {
    return NextResponse.json(
      {
        errorVi:
          "Phiên làm việc không tồn tại, đã hết thời hạn 24 giờ, đã bị xóa hoặc trình duyệt hiện tại không có khóa truy cập phiên này.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { payload },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  );
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  if (sessionId === "demo") {
    return NextResponse.json({ payload: getDemoSessionPayload() });
  }

  const secret = extractSecretFromRequest(req, sessionId);
  const store = getSessionStore();
  if (!store.verifyAccess(sessionId, secret)) {
    return NextResponse.json(
      { errorVi: "Không có quyền truy cập phiên làm việc này." },
      { status: 404 }
    );
  }

  const updated = store.updateSessionInternal(sessionId, (draft) => {
    draft.status = "processing";
    draft.errorMessageVi = null;
    draft.progress = {
      step: 1,
      stepLabelVi: "Đang khởi động xử lý lại tài liệu...",
      detailVi: "Kiểm tra lại kết nối và cấu trúc tệp PDF...",
      percent: 10,
    };
  });

  void runSessionProcessingPipeline(sessionId);

  return NextResponse.json({ payload: updated });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  if (sessionId === "demo") {
    return NextResponse.json({ deleted: true });
  }

  const secret = extractSecretFromRequest(req, sessionId);
  const store = getSessionStore();
  const deleted = store.deleteSession(sessionId, secret);

  if (!deleted) {
    return NextResponse.json(
      {
        errorVi:
          "Phiên làm việc không còn tồn tại trên máy chủ hoặc không khớp khóa truy cập.",
      },
      { status: 404 }
    );
  }

  const res = NextResponse.json({
    deleted: true,
    messageVi: "Đã xóa vĩnh viễn tệp PDF, bản phân tích và hội thoại khỏi máy chủ.",
  });
  res.cookies.delete(`ps_${sessionId}`);
  return res;
}
