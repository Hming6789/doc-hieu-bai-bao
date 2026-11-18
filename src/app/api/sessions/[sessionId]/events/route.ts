import { NextRequest, NextResponse } from "next/server";
import { getDemoSessionPayload } from "@/lib/demo-data";
import { getSessionStore } from "@/lib/session-store";
import { extractSecretFromRequest } from "@/lib/pipeline-runner";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;

  if (sessionId === "demo") {
    const encoder = new TextEncoder();
    const demoData = JSON.stringify({
      type: "state",
      payload: getDemoSessionPayload(),
    });
    return new NextResponse(encoder.encode(`data: ${demoData}\n\n`), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const secret = extractSecretFromRequest(req, sessionId);
  const store = getSessionStore();
  const initial = store.getSession(sessionId, secret);

  if (!initial) {
    return NextResponse.json(
      { errorVi: "Phiên làm việc không tồn tại hoặc không hợp lệ." },
      { status: 404 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      send({ type: "init", payload: initial });

      if (initial.status !== "processing") {
        controller.close();
        return;
      }

      const unsubscribe = store.subscribe(sessionId, (evt) => {
        send(evt);
        if (evt.payload.status !== "processing") {
          unsubscribe();
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
