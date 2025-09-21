// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs"; // ← 重要（Edgeだと失敗しやすい）

const stripeSecret = process.env.STRIPE_SECRET_KEY!;
const priceId = process.env.STRIPE_PRICE_ID!;

if (!stripeSecret) {
  throw new Error("STRIPE_SECRET_KEY is missing");
}
if (!priceId) {
  throw new Error("STRIPE_PRICE_ID is missing");
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2025-08-27.basil", // ダッシュボードのAPIバージョンに合わせる（固定でOK）
});

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json(); // ← あなたのツールで使う購入者のAPIキー
    if (!apiKey) {
      return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    }

    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          // ★このどちらかが必須（今回は price を使う）
          price: priceId,
          quantity: 1,
          // price_data を使う場合は price を消して下記を定義:
          // price_data: {
          //   currency: "jpy",
          //   unit_amount: 1000,
          //   product_data: { name: "検索クレジット5回" },
          // },
        },
      ],
      success_url: `${origin}/credits/success?k=${encodeURIComponent(apiKey)}`,
      cancel_url: `${origin}/credits/cancel`,
      // Webhook でどのキーを加算するか識別するために付与
      metadata: { apiKey },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("Checkout create error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Internal Error" }, { status: 500 });
  }
}
