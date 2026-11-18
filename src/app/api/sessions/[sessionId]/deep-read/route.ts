import { NextRequest, NextResponse } from "next/server";
import { getDemoSessionPayload } from "@/lib/demo-data";
import {
  explainSectionInDepth,
  MissingApiKeyError,
} from "@/lib/gemini-analyzer";
import { extractSecretFromRequest } from "@/lib/pipeline-runner";
import { getSessionStore } from "@/lib/session-store";
import type { DeepSectionExplanation, DepthLevel } from "@/types/paper";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  const body = (await req.json().catch(() => ({}))) as {
    sectionId?: string;
    depth?: DepthLevel;
  };

  const sectionId = body.sectionId?.trim();
  const depth: DepthLevel = body.depth === "technical" ? "technical" : "basic";

  if (!sectionId) {
    return NextResponse.json(
      { errorVi: "Thiếu mã mục cần Đọc sâu." },
      { status: 400 }
    );
  }

  if (sessionId === "demo") {
    const demo = getDemoSessionPayload();
    const sec =
      demo.sections.find((s) => s.sectionId === sectionId) ?? demo.sections[0];
    const demoDeep: DeepSectionExplanation = {
      sectionId: sec.sectionId,
      sectionTitle: sec.title,
      depth,
      generatedAt: new Date().toISOString(),
      keyArguments: [
        {
          statementType: "ai_explanation",
          textVi:
            depth === "basic"
              ? `[Minh họa Đọc sâu - Mức trực quan] Mục "${sec.title}" giải thích cách kết nối dự báo dòng chảy ngắn hạn vào bộ tối ưu lịch xả nước để vừa giữ cột nước phát điện, vừa chừa dung tích đón lũ.`
              : `[Minh họa Đọc sâu - Mức kỹ thuật chi tiết] Mục "${sec.title}" thiết lập bài toán tối ưu đa mục tiêu dưới ràng buộc bất đẳng thức trạng thái mực nước Z_dead ≤ Z(t) ≤ Z_flood_limit và ràng buộc xả sinh thái Q_min_eco ≥ 18,0 m³/s, với bộ dự báo LSTM huấn luyện tách biệt trên giai đoạn 2005–2015.`,
          citationIds: sec.chunkIds.slice(0, 2),
        },
      ],
      termsAndConceptsClarified: [
        {
          termEn: "Rolling forecast (7-day)",
          explanationVi:
            "Dự báo cuốn chiếu 7 ngày tới, cập nhật lại ở mỗi bước thời gian khi có số liệu đo mới.",
        },
      ],
      tablesFiguresFormulasInSection: (
        demo.analysis?.visualElements ?? []
      ).filter((el) => el.pdfPage === sec.startPdfPage),
      criticalReadingNotes: [
        {
          statementType: "methodological_note",
          textVi:
            "Đây là phản hồi mẫu để minh họa chế độ Đọc sâu. Khi tải PDF thật, hệ thống sẽ gửi kèm ảnh trang gốc của mục này tới Gemini Vision để giải thích chi tiết từng công thức và biểu đồ.",
          citationIds: sec.chunkIds.slice(0, 1),
        },
      ],
    };
    return NextResponse.json({
      key: `${sec.sectionId}:${depth}`,
      explanation: demoDeep,
    });
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

  const cacheKey = `${sectionId}:${depth}`;
  if (session.deepExplanations[cacheKey]) {
    return NextResponse.json({
      key: cacheKey,
      explanation: session.deepExplanations[cacheKey],
    });
  }

  const targetSection = session.sections.find((s) => s.sectionId === sectionId);
  if (!targetSection) {
    return NextResponse.json(
      { errorVi: "Không tìm thấy mục đã chọn trong bài báo." },
      { status: 404 }
    );
  }

  const pdfBuffer = store.getPdfBufferInternal(sessionId);
  const chunks = store.getChunksInternal(sessionId);
  if (!pdfBuffer || chunks.length === 0) {
    return NextResponse.json(
      { errorVi: "Dữ liệu trích xuất của phiên không đầy đủ." },
      { status: 400 }
    );
  }

  try {
    const explanation = await explainSectionInDepth({
      pdfBuffer,
      section: targetSection,
      depth,
      allChunks: chunks,
      citationMap: session.citationMap,
      totalPages: session.extractionReport?.totalPages ?? 1,
    });

    store.saveDeepExplanation(sessionId, secret, cacheKey, explanation);
    return NextResponse.json({ key: cacheKey, explanation });
  } catch (err) {
    const msg =
      err instanceof MissingApiKeyError
        ? err.userMessageVi
        : err instanceof Error
        ? err.message
        : "Không thể giải thích chuyên sâu mục này.";
    return NextResponse.json({ errorVi: msg }, { status: 500 });
  }
}
