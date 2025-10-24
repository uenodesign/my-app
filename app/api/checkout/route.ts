// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// === ユーティリティ ===
const normalizeApiKey = (raw: string) =>
  String(raw).trim().replace(/[\s\u3000]+/g, "").replace(/^["']+|["']+$/g, "");
const normalizeEmail = (raw: string) => String(raw).trim().toLowerCase();

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const PRICE_ID = (process.env.STRIPE_PRICE_ID || "").trim();            // 100円 one-time price
const PROMO_CODE_ID = (process.env.STRIPE_PROMO_CODE_ID || "").trim();  // 100%OFF promotion_code（初回のみ）

const stripe = new Stripe(STRIPE_SECRET_KEY);

type CheckoutBody = { apiKey?: string; email?: string };

function json(data: unknown, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as CheckoutBody;
    const apiKey = normalizeApiKey(body.apiKey ?? "");
    const email = normalizeEmail(body.email ?? "");

    if (!apiKey) return json({ message: "apiKey が必要です" }, 400);
    if (!email) return json({ message: "email が必要です" }, 400);

    // 必須env（PROMO_CODE_IDは“初回無料”がある場合のみ使用）
    if (!STRIPE_SECRET_KEY || !PRICE_ID) {
      return json({ message: "サーバー未設定: STRIPE_SECRET_KEY / STRIPE_PRICE_ID" }, 500);
    }

    // 付与対象キー／トライアル判定（メール単位）— Webhook と帳簿を揃える
    const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const emailHash = crypto.createHash("sha256").update(email).digest("hex");
    const trialRefEmail = adminDb.collection("free_trials_by_email").doc(emailHash);
    const trialSnapEmail = await trialRefEmail.get();
    const isFirstTimeByEmail = !trialSnapEmail.exists;
    const canApplyFree = isFirstTimeByEmail && !!PROMO_CODE_ID;

    // Stripe Checkout セッション：discounts と allow_promotion_codes は“どちらか一方だけ”
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      ...(canApplyFree
        ? { discounts: [{ promotion_code: PROMO_CODE_ID }] } // 初回メールのみ自動で100%OFF
        : { allow_promotion_codes: false }                   // 2回目以降、任意コード入力は禁止
      ),
      automatic_tax: { enabled: false },
      customer_email: email, // Stripe上の顧客識別安定用（WebhookでもemailHashに使用）
      metadata: {
        product: "credits",
        apiKeyHash,
        emailHash,
      },
      client_reference_id: apiKeyHash,
      success_url: `${BASE_URL}/credits/success`,
      cancel_url: `${BASE_URL}/credits/cancel`,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    return json({ url: session.url }, 200);
  } catch (e) {
    const msg = (e as { message?: string })?.message || "Stripe Checkout 作成に失敗しました";
    console.error("[/api/checkout] error:", e);
    return json({ message: msg }, 400);
  }
}
