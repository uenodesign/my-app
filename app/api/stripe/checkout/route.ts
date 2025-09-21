import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil", // ダッシュボードのAPIバージョンに合わせる（未指定でも可）
});

export async function POST(req: NextRequest) {
  try {
    // 成功/キャンセル遷移用の絶対URL（環境に合わせて）
    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: process.env.PRICE_ID!, quantity: 1 }],
      success_url: `${origin}/credits/success`,
      cancel_url: `${origin}/credits/cancel`,
      // メタデータは後でWebhook用に使う（今は空でもOK）
      // metadata: { apiKey: "（必要ならここにAPIキー）" },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("CHECKOUT_CREATE_ERROR:", err?.message || err);
    return NextResponse.json({ error: err?.message || "internal" }, { status: 500 });
  }
}

export async function GET() {
  // 動作確認で叩かれることがあるので404を返す
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
