import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";

function normalizeApiKey(raw?: string) {
  return (raw ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/\u3000/g, "");
}
function hashKey(rawKey: string) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const adminSecret = req.headers.get("x-admin-secret");
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const apiKey = normalizeApiKey(body.apiKey);
    if (!apiKey) return NextResponse.json({ error: "apiKey required" }, { status: 400 });

    const addPaid = Number(body.addPaid ?? 0);
    const addFree = Number(body.addFree ?? 0);
    const forceInit = Boolean(body.forceInit);

    const keyId = hashKey(apiKey);
    const ref = adminDb.collection("credits_keys").doc(keyId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      let free = 0,
        paid = 0;
      if (snap.exists) {
        const d = (snap.data() as { free?: number; paid?: number }) || {};
        free = d.free ?? 0;
        paid = d.paid ?? 0;
      }

      if (forceInit) {
        free = 2;
        paid = 0;
      } else {
        free = Math.max(0, free + addFree);
        paid = Math.max(0, paid + addPaid);
      }

      tx.set(ref, { free, paid, updatedAt: new Date() }, { merge: true });
    });

    const after = (await ref.get()).data() as { free?: number; paid?: number } | undefined;
    return NextResponse.json({ ok: true, keyId, after });
  } catch (e) {
    console.error("topup error", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
