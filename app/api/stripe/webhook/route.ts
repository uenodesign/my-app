// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export const runtime = "nodejs";

// App Router では生のボディが必要。次の 2 行で生ボディを扱えるようにする。
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";

function hashKey(rawKey: string) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2025-08-27.basil", // Stripeダッシュボードの表示に合わせてOK
  });

  // 生ボディを取る（App Router）
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (err: any) {
    console.error("⚠️ Webhook signature verify failed:", err?.message || err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ここからイベントの種類ごとに処理
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // 1) metadata から apiKey を取得
    const apiKey = (session.metadata && session.metadata.apiKey) || "";
    if (!apiKey) {
      console.error("❌ metadata.apiKey が空");
      return NextResponse.json({ ok: true }); // 200で返す（リトライ嵐を避ける）
    }

    // 2) ハッシュ化してドキュメントID化
    const keyId = hashKey(apiKey);

    // 3) credits_keys/{keyId} の paid を +5
    const ref = adminDb.collection("credits_keys").doc(keyId);
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = (snap.data() as { free?: number; paid?: number }) || {};
      const paid = (data.paid ?? 0) + 5;
      tx.set(ref, { paid }, { merge: true });
    });

    console.log("✅ クレジット +5 付与完了:", keyId);
  } else {
    // 他のイベントはログだけ
    console.log("Unhandled event type:", event.type);
  }

  return NextResponse.json({ ok: true });
}
