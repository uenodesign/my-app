// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { priceId?: string; apiKey?: string };
    const { priceId, apiKey } = body;

    if (!priceId || !apiKey) {
      return NextResponse.json({ error: "priceId/apiKey が必要です" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/credits/success?k=${encodeURIComponent(apiKey)}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/credits/cancel`,
      metadata: { apiKey }, // ここが命（webhook で読む）
    });

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: "Checkout 作成失敗" }, { status: 500 });
  }
}
