// lib/hash.ts
import crypto from "crypto";

/** Google Places の生APIキー → 安全なID(sha256) に変換 */
export function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}
