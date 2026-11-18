import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  answerPaperQuestionVi,
  MissingApiKeyError,
} from "@/lib/gemini-analyzer";
import { extractSecretFromRequest } from "@/lib/pipeline-runner";
import { getSessionStore } from "@/lib/session-store";
import type { ChatTurn } from "@/types/paper";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  const body = (await req.json().catch(() => ({}))) as {
    questionVi?: string;
    focusPdfPage?: number | null;
  };

  const questionVi = body.questionVi?.trim();
  if (!questionVi) {
    return NextResponse.json(
      { errorVi: "Vui lòng nhập câu hỏi bằng tiếng Việt." },
      { status: 400 }
    );
  }
  if (questionVi.length > 1500) {
    return NextResponse.json(
      { errorVi: "Câu hỏi quá dài (tối đa 1.500 ký tự)." },
      { status: 400 }
    );
  }

  if (sessionId === "demo") {
    const demoTurn: ChatTurn = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      questionVi,
      answer: {
        inPaperAnswers: [
          {
            statementType: "author_claim",
            textVi:
              "[Phản hồi mẫu minh họa] Trong tệp PDF mẫu, tác giả giả định hiệu suất tổ máy hằng số η = 0,88, ràng buộc mực nước 65,0 m – 88,5 m và chỉ chạy mô phỏng hồi cứu giai đoạn 2016–2020.",
            citationIds: ["D02-B02", "D03-B02"],
          },
        ],
        notInPaperNoticeVi:
          "Tài liệu mẫu không cung cấp đường đặc tính cột nước – lưu lượng chi tiết của từng tổ máy hay mã nguồn thực nghiệm. (Khi bạn tải PDF bài báo thật, hệ thống sẽ đối chiếu trực tiếp toàn văn qua Google Gemini API).",
        externalKnowledgeBox: {
          explanationVi:
            "Trong vận hành thủy điện thực tế, hiệu suất tuabin phụ thuộc phi tuyến vào cả cột nước tĩnh thực tế và lưu lượng mở cánh hướng dòng (đường đặc tính đồi - hill chart).",
          verifiableSources: [
            "Loucks, D. P., & van Beek, E. (2017). Water Resource Systems Planning and Management, Springer.",
          ],
        },
        followUpSuggestions: [
          "Điều kiện nào cần thỏa mãn để áp dụng sang hồ chứa khác?",
          "Vì sao chia dữ liệu theo thời gian giúp tránh rò rỉ dữ liệu?",
        ],
      },
    };
    return NextResponse.json({ turn: demoTurn });
  }

  const secret = extractSecretFromRequest(req, sessionId);
  const store = getSessionStore();
  const session = store.getSession(sessionId, secret);

  if (!session || !secret) {
    return NextResponse.json(
      { errorVi: "Phiên làm việc không tồn tại hoặc đã hết hạn." },
      { status: 404 }
    );
  }

  const pdfBuffer = store.getPdfBufferInternal(sessionId);
  const chunks = store.getChunksInternal(sessionId);
  if (!pdfBuffer || !session.extractionReport || chunks.length === 0) {
    return NextResponse.json(
      {
        errorVi:
          "Bài báo đang trong quá trình trích xuất hoặc bị lỗi, chưa thể hỏi đáp.",
      },
      { status: 400 }
    );
  }

  try {
    const answer = await answerPaperQuestionVi({
      pdfBuffer,
      questionVi,
      focusPdfPage: body.focusPdfPage ?? null,
      chunks,
      report: session.extractionReport,
      citationMap: session.citationMap,
      priorHistory: session.chatHistory,
    });

    const turn: ChatTurn = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      questionVi,
      answer,
    };

    store.appendChatTurn(sessionId, secret, turn);
    return NextResponse.json({ turn });
  } catch (err) {
    const msg =
      err instanceof MissingApiKeyError
        ? err.userMessageVi
        : err instanceof Error
        ? err.message
        : "Không thể trả lời câu hỏi lúc này.";
    return NextResponse.json({ errorVi: msg }, { status: 500 });
  }
}
