// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil",
});

function hashKey(rawKey: string) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature") as string | null;
  const secret = process.env.STRIPE_WEBHOOK_SECRET as string | undefined;
  if (!sig || !secret) return NextResponse.json({ received: true });

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: unknown) {
    console.error("Webhook signature verify failed", err);
    return new NextResponse("Bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const apiKey = (session.metadata?.apiKey ?? "").trim();
    if (apiKey) {
      const keyId = hashKey(apiKey);
      const ref = adminDb.collection("credits_keys").doc(keyId);
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const d = (snap.data() as { free?: number; paid?: number } | undefined) || {};
        const paid = (d.paid ?? 0) + 5; // 5回分を付与
        tx.set(ref, { free: d.free ?? 0, paid }, { merge: true });
      });
    }
  }

  return NextResponse.json({ received: true });
}
