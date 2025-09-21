// app/api/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import crypto from "crypto";

const LIMITS = {
  free: { perRun: 10, perMonth: 2 },
  standard: { perRun: 60, perMonth: 5 },
} as const;
type Plan = keyof typeof LIMITS;

const ym = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const hashKey = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey) return NextResponse.json({ error: "apiKey required" }, { status: 400 });

    const keyId = hashKey(apiKey);
    const nowYm = ym();

    // plan 取得（無ければ free）
    const planDoc = await adminDb.collection("plans").doc(keyId).get();
    const plan: Plan = (planDoc.exists ? (planDoc.data()?.plan as Plan) : "free") || "free";

    // usage 読み取り（今月以外は 0 扱い）
    const usageDoc = await adminDb.collection("usage_keys").doc(keyId).get();
    let used = 0;
    if (usageDoc.exists) {
      const data = usageDoc.data() as { count?: number; month?: string };
      used = data.month === nowYm ? data.count ?? 0 : 0;
    }
    const { perMonth, perRun } = LIMITS[plan];
    const remaining = Math.max(0, perMonth - used);

    return NextResponse.json({ plan, perMonth, perRun, used, remaining, month: nowYm });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
