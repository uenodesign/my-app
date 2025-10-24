// lib/normalize.ts
export function normalizeApiKey(raw: string): string {
  return String(raw)
    .trim()
    .replace(/[\s\u3000]+/g, "")
    .replace(/^["']+|["']+$/g, "");
}
