// app/api/token/new/route.ts
import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// （必要なら使う）SHA-256
function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST() {
  // 読み取りは await cookies()
  const jar = await cookies();
  const existing = jar.get("app_token")?.value;

  // 既にあれば何もしない（冪等）→ 204
  if (existing) {
    return new Response(null, { status: 204 });
  }

  // 新規発行
  const token = crypto.randomBytes(24).toString("base64url");

  // レスポンスに対して Cookie をセットする（Next.js 15 推奨）
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set({
    name: "app_token",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    // 必要なら有効期限
    // maxAge: 60 * 60 * 24 * 365,
  });

  // （任意）ここで token のハッシュを DB 初期化してもOK
  // const tokenHash = sha256Hex(token);
  // await adminDb.collection("app_tokens").doc(tokenHash).set({ free_remaining: 5, paid_remaining: 0, createdAt: Date.now() }, { merge: true });

  return res;
}
