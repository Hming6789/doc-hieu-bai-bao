import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function readDotEnvFileSafe(filePath: string): Record<string, string> {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      parsed[key] = val;
    }
    return parsed;
  } catch {
    return {};
  }
}

function isPlaceholderKey(val: string | undefined): boolean {
  if (!val) return true;
  const v = val.trim();
  return (
    !v ||
    v === "AIzaSy..." ||
    v === "sk-proj-..." ||
    v === "DAN_GEMINI_API_KEY_CUA_BAN_VAO_DAY" ||
    v.includes("DAN_KHOA") ||
    v.includes("DAN_GEMINI")
  );
}

function resolveDynamicEnvValue(key: string): string | null {
  const isApiKeyField =
    key === "GEMINI_API_KEY" ||
    key === "GOOGLE_API_KEY" ||
    key === "OPENAI_API_KEY";

  // Check .env.local and .env on disk first so live edits take effect immediately without restarting dev server
  const candidateFiles = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.join(os.homedir(), ".env"),
  ];

  for (const filePath of candidateFiles) {
    const map = readDotEnvFileSafe(filePath);
    const val = map[key]?.trim();
    if (val && (!isApiKeyField || !isPlaceholderKey(val))) {
      return val;
    }
  }

  const fromProc = process.env[key]?.trim();
  if (fromProc && (!isApiKeyField || !isPlaceholderKey(fromProc))) {
    return fromProc;
  }

  return null;
}

export function getGeminiApiKey(): string | null {
  return (
    resolveDynamicEnvValue("GEMINI_API_KEY") ||
    resolveDynamicEnvValue("GOOGLE_API_KEY")
  );
}

const RETIRED_GEMINI_MODELS = new Set([
  "gemini-2.5-flash",
  "models/gemini-2.5-flash",
  "gemini-2.0-flash",
  "models/gemini-2.0-flash",
  "gemini-1.5-flash",
]);

export function getGeminiModel(): string {
  const configured = resolveDynamicEnvValue("GEMINI_MODEL");
  if (!configured || RETIRED_GEMINI_MODELS.has(configured)) {
    return "gemini-3.5-flash";
  }
  return configured;
}

export function getDataDir(): string {
  const custom = resolveDynamicEnvValue("DATA_DIR");
  return custom ? path.resolve(custom) : path.resolve(process.cwd(), ".data");
}

export function getSessionTtlHours(): number {
  const raw = resolveDynamicEnvValue("SESSION_TTL_HOURS");
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0 && parsed <= 168) {
    return parsed;
  }
  return 24;
}

export const MAX_PDF_PAGES = 50;
export const MAX_PDF_BYTES = 30 * 1024 * 1024; // 30 MB
