import type { LocalRecentSession } from "@/types/paper";

const STORAGE_KEY = "paper_reader_recent_sessions_v1";

export function loadLocalSessions(): LocalRecentSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalRecentSession[];
    const now = Date.now();
    const valid = parsed.filter(
      (item) =>
        item &&
        item.sessionId &&
        item.sessionSecret &&
        new Date(item.expiresAt).getTime() > now
    );
    if (valid.length !== parsed.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

export function saveLocalSession(entry: LocalRecentSession): void {
  if (typeof window === "undefined") return;
  if (entry.sessionId === "demo") return;
  try {
    const current = loadLocalSessions().filter(
      (s) => s.sessionId !== entry.sessionId
    );
    const updated = [entry, ...current].slice(0, 12);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

export function updateLocalSessionDomain(
  sessionId: string,
  domainLabelVi: string
): void {
  if (typeof window === "undefined" || sessionId === "demo") return;
  try {
    const current = loadLocalSessions();
    const next = current.map((s) =>
      s.sessionId === sessionId ? { ...s, domainLabelVi } : s
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
}

export function getLocalSecretForSession(sessionId: string): string | null {
  if (sessionId === "demo") return "demo";
  const found = loadLocalSessions().find((s) => s.sessionId === sessionId);
  return found?.sessionSecret ?? null;
}

export function removeLocalSession(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = loadLocalSessions().filter((s) => s.sessionId !== sessionId);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
}
