import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getDataDir, getSessionTtlHours } from "./env-config.ts";
import type {
  ChatTurn,
  DeepSectionExplanation,
  DocumentChunk,
  ProcessingProgress,
  SessionPayload,
  SessionStatus,
} from "../types/paper.ts";

function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret, "utf-8").digest("hex");
}

function safeEqualHex(aHex: string, bHex: string): boolean {
  if (aHex.length !== bHex.length) return false;
  const bufA = Buffer.from(aHex, "hex");
  const bufB = Buffer.from(bHex, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export class SessionStore {
  private db: DatabaseSync;
  private baseDir: string;
  private sessionsDir: string;
  private emitter: EventEmitter;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(customBaseDir?: string) {
    this.baseDir = customBaseDir ? path.resolve(customBaseDir) : getDataDir();
    this.sessionsDir = path.join(this.baseDir, "sessions");
    fs.mkdirSync(this.sessionsDir, { recursive: true });

    const dbPath = path.join(this.baseDir, "sessions.sqlite");
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS paper_sessions (
        session_id TEXT PRIMARY KEY,
        secret_hash TEXT NOT NULL,
        file_name TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_paper_sessions_expires_at
        ON paper_sessions(expires_at);
    `);

    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);

    if (!customBaseDir) {
      this.cleanupTimer = setInterval(() => {
        try {
          this.cleanupExpiredSessions();
        } catch {
          // Ignore background cleanup error
        }
      }, 15 * 60 * 1000);
      this.cleanupTimer.unref?.();
    }
  }

  public createSession(
    fileName: string,
    pdfBuffer: Buffer,
    ttlHoursOverride?: number
  ): {
    sessionId: string;
    sessionSecret: string;
    payload: SessionPayload;
  } {
    this.cleanupExpiredSessions();

    const sessionId = crypto.randomUUID();
    const sessionSecret = crypto.randomBytes(32).toString("hex");
    const secretHash = hashSecret(sessionSecret);

    const nowMs = Date.now();
    const ttlHours = ttlHoursOverride ?? getSessionTtlHours();
    const expiresMs = nowMs + Math.round(ttlHours * 3600 * 1000);

    const sessionFolder = this.getSessionFolder(sessionId);
    fs.mkdirSync(sessionFolder, { recursive: true });
    fs.writeFileSync(path.join(sessionFolder, "original.pdf"), pdfBuffer);

    const initialProgress: ProcessingProgress = {
      step: 1,
      stepLabelVi: "Kiểm tra cấu trúc tệp PDF & đánh số trang",
      detailVi: "Đang khởi tạo phiên làm việc cô lập...",
      percent: 8,
    };

    const payload: SessionPayload = {
      sessionId,
      fileName,
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(expiresMs).toISOString(),
      status: "processing",
      progress: initialProgress,
      errorMessageVi: null,
      pageMappings: [],
      sections: [],
      extractionReport: null,
      citationMap: {},
      analysis: null,
      deepExplanations: {},
      chatHistory: [],
    };

    const stmt = this.db.prepare(`
      INSERT INTO paper_sessions (
        session_id, secret_hash, file_name, status,
        created_at, updated_at, expires_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      sessionId,
      secretHash,
      fileName,
      payload.status,
      nowMs,
      nowMs,
      expiresMs,
      JSON.stringify(payload)
    );

    return { sessionId, sessionSecret, payload };
  }

  public verifyAccess(sessionId: string, sessionSecret: string | null | undefined): boolean {
    if (!sessionId || !sessionSecret) return false;
    this.cleanupExpiredSessions();

    const row = this.db
      .prepare(
        `SELECT secret_hash, expires_at FROM paper_sessions WHERE session_id = ?`
      )
      .get(sessionId) as { secret_hash: string; expires_at: number } | undefined;

    if (!row) return false;
    if (row.expires_at <= Date.now()) {
      this.forceDeleteInternal(sessionId);
      return false;
    }

    const candidateHash = hashSecret(sessionSecret);
    return safeEqualHex(row.secret_hash, candidateHash);
  }

  public getSession(
    sessionId: string,
    sessionSecret: string | null | undefined
  ): SessionPayload | null {
    if (!this.verifyAccess(sessionId, sessionSecret)) return null;
    const row = this.db
      .prepare(`SELECT payload_json FROM paper_sessions WHERE session_id = ?`)
      .get(sessionId) as { payload_json: string } | undefined;

    if (!row) return null;
    return JSON.parse(row.payload_json) as SessionPayload;
  }

  public getSessionInternal(sessionId: string): SessionPayload | null {
    const row = this.db
      .prepare(
        `SELECT payload_json, expires_at FROM paper_sessions WHERE session_id = ?`
      )
      .get(sessionId) as { payload_json: string; expires_at: number } | undefined;
    if (!row) return null;
    if (row.expires_at <= Date.now()) {
      this.forceDeleteInternal(sessionId);
      return null;
    }
    return JSON.parse(row.payload_json) as SessionPayload;
  }

  public saveChunksInternal(sessionId: string, chunks: DocumentChunk[]): void {
    const folder = this.getSessionFolder(sessionId);
    if (!fs.existsSync(folder)) return;
    fs.writeFileSync(
      path.join(folder, "chunks.json"),
      JSON.stringify(chunks),
      "utf-8"
    );
  }

  public getChunksInternal(sessionId: string): DocumentChunk[] {
    const chunkPath = path.join(this.getSessionFolder(sessionId), "chunks.json");
    if (!fs.existsSync(chunkPath)) return [];
    return JSON.parse(fs.readFileSync(chunkPath, "utf-8")) as DocumentChunk[];
  }

  public getPdfBuffer(
    sessionId: string,
    sessionSecret: string | null | undefined
  ): Buffer | null {
    if (!this.verifyAccess(sessionId, sessionSecret)) return null;
    return this.getPdfBufferInternal(sessionId);
  }

  public getPdfBufferInternal(sessionId: string): Buffer | null {
    const pdfPath = path.join(this.getSessionFolder(sessionId), "original.pdf");
    if (!fs.existsSync(pdfPath)) return null;
    return fs.readFileSync(pdfPath);
  }

  public updateProgressInternal(
    sessionId: string,
    progress: ProcessingProgress
  ): void {
    const current = this.getSessionInternal(sessionId);
    if (!current) return;
    current.progress = progress;
    this.persistPayloadInternal(sessionId, current.status, current);
    this.emitter.emit(`session:${sessionId}`, {
      type: "progress",
      payload: current,
    });
  }

  public updateSessionInternal(
    sessionId: string,
    updater: (draft: SessionPayload) => void
  ): SessionPayload | null {
    const current = this.getSessionInternal(sessionId);
    if (!current) return null;
    updater(current);
    this.persistPayloadInternal(sessionId, current.status, current);
    this.emitter.emit(`session:${sessionId}`, {
      type: "state",
      payload: current,
    });
    return current;
  }

  public appendChatTurn(
    sessionId: string,
    sessionSecret: string,
    turn: ChatTurn
  ): SessionPayload | null {
    if (!this.verifyAccess(sessionId, sessionSecret)) return null;
    return this.updateSessionInternal(sessionId, (draft) => {
      draft.chatHistory.push(turn);
    });
  }

  public saveDeepExplanation(
    sessionId: string,
    sessionSecret: string,
    key: string,
    explanation: DeepSectionExplanation
  ): SessionPayload | null {
    if (!this.verifyAccess(sessionId, sessionSecret)) return null;
    return this.updateSessionInternal(sessionId, (draft) => {
      draft.deepExplanations[key] = explanation;
    });
  }

  public deleteSession(
    sessionId: string,
    sessionSecret: string | null | undefined
  ): boolean {
    if (!this.verifyAccess(sessionId, sessionSecret)) return false;
    this.forceDeleteInternal(sessionId);
    return true;
  }

  public cleanupExpiredSessions(nowMs: number = Date.now()): number {
    const expiredRows = this.db
      .prepare(`SELECT session_id FROM paper_sessions WHERE expires_at <= ?`)
      .all(nowMs) as { session_id: string }[];

    for (const row of expiredRows) {
      this.forceDeleteInternal(row.session_id);
    }
    return expiredRows.length;
  }

  public subscribe(
    sessionId: string,
    listener: (event: { type: string; payload: SessionPayload }) => void
  ): () => void {
    const channel = `session:${sessionId}`;
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.off(channel, listener);
    };
  }

  public close(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.db.close();
  }

  private persistPayloadInternal(
    sessionId: string,
    status: SessionStatus,
    payload: SessionPayload
  ): void {
    this.db
      .prepare(
        `UPDATE paper_sessions
         SET status = ?, updated_at = ?, payload_json = ?
         WHERE session_id = ?`
      )
      .run(status, Date.now(), JSON.stringify(payload), sessionId);
  }

  private forceDeleteInternal(sessionId: string): void {
    this.db
      .prepare(`DELETE FROM paper_sessions WHERE session_id = ?`)
      .run(sessionId);
    const folder = this.getSessionFolder(sessionId);
    if (fs.existsSync(folder)) {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  }

  private getSessionFolder(sessionId: string): string {
    const safeId = path.basename(sessionId);
    return path.join(this.sessionsDir, safeId);
  }
}

const globalForStore = globalThis as unknown as {
  __paperSessionStore?: SessionStore;
};

export function getSessionStore(): SessionStore {
  if (!globalForStore.__paperSessionStore) {
    globalForStore.__paperSessionStore = new SessionStore();
  }
  return globalForStore.__paperSessionStore;
}
