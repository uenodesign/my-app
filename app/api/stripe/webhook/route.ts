// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const stripe = new Stripe(STRIPE_SECRET_KEY);

// 付与単位（有料・トライアルで増やす回数）
const ADD_PAID = 10;

function json(data: unknown, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  // --- 署名検証（生ボディ必須）---
  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) return json({ ok: false, error: "Missing signature" }, 400);
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = (err as { message?: string })?.message ?? "Invalid signature";
    return json({ ok: false, error: msg }, 400);
  }

  // --- 冪等性（event.id で一度きり）---
  const evRef = adminDb.collection("stripe_events").doc(event.id);
  if ((await evRef.get()).exists) {
    return json({ ok: true, idempotentBy: "event" }, 200);
  }

  // デバッグ箱（どのデプロイが処理したかも刻む）
  const dbgRef = adminDb.collection("stripe_debug_events").doc(event.id);
  await dbgRef.set(
    {
      step: "received",
      type: event.type,
      vercelEnv: process.env.VERCEL_ENV || "unknown",
      projectUrl:
        process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "unknown",
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
      commitMsg: process.env.VERCEL_GIT_COMMIT_MESSAGE || "unknown",
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  try {
    // 対象外イベントは無視
    if (event.type !== "checkout.session.completed") {
      await evRef.set({ type: event.type, createdAt: FieldValue.serverTimestamp() });
      await dbgRef.set(
        { step: "ignored", type: event.type, at: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return json({ ok: true, ignored: event.type }, 200);
    }

    // ====== 本処理 ======
    const s = event.data.object as Stripe.Checkout.Session;

    // 付与先キー＆識別
    const apiKeyHash = (s.metadata?.apiKeyHash || s.client_reference_id || "").toString().trim();
    const emailHash = (s.metadata?.emailHash || "").toString().trim();
    const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id || "";

    // 金額まわり
    const amountTotal = s.amount_total ?? 0;
    const amountDiscount = s.total_details?.amount_discount ?? 0;

    // クーポン適用の堅牢判定：
    const hasBreakdownDiscounts =
      Array.isArray(s.total_details?.breakdown?.discounts) &&
      (s.total_details!.breakdown!.discounts!.length ?? 0) > 0;

    type SessionWithDiscounts = Stripe.Checkout.Session & { discounts?: unknown };
    const sessionDiscountsUnknown = (s as SessionWithDiscounts).discounts;
    const hasSessionDiscounts =
      Array.isArray(sessionDiscountsUnknown) && sessionDiscountsUnknown.length > 0;

    const isPaid = amountTotal > 0; // 100円
    const isCouponFree =
      amountTotal === 0 && (amountDiscount > 0 || hasBreakdownDiscounts || hasSessionDiscounts); // クーポン0円
    const isTrialFree = amountTotal === 0 && !isCouponFree; // 純0円（クーポンなし）

    await dbgRef.set(
      {
        step: "parsed",
        apiKeyHash_len: apiKeyHash.length,
        hasCustomer: !!customerId,
        amountTotal,
        amountDiscount,
        hasBreakdownDiscounts,
        hasSessionDiscounts,
        mode: isPaid ? "paid" : isCouponFree ? "coupon_free" : "trial_free",
        at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // apiKeyHash 不正ならスキップ
    if (!/^[a-f0-9]{64}$/.test(apiKeyHash)) {
      await evRef.set({
        type: event.type,
        note: "missing apiKeyHash",
        createdAt: FieldValue.serverTimestamp(),
      });
      await dbgRef.set(
        { step: "missing_apiKeyHash", at: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return json({ ok: true, skipped: "missing apiKeyHash" }, 200);
    }

    // 参照
    const keyRef = adminDb.collection("credits_keys").doc(apiKeyHash);
    const trialByCustomerRef = customerId ? adminDb.collection("free_trials").doc(customerId) : null;
    const trialByEmailRef = emailHash ? adminDb.collection("free_trials_by_email").doc(emailHash) : null;

    // ===== 付与トランザクション =====
    await adminDb.runTransaction(async (tx) => {
      if ((await tx.get(evRef)).exists) return; // 冪等化

      // 無ければ初期化
      if (!(await tx.get(keyRef)).exists) {
        tx.set(keyRef, { free: 0, paid: 0, createdAt: FieldValue.serverTimestamp() });
      }

      // --- クーポン無料 ---
      if (isCouponFree) {
        tx.update(keyRef, {
          free: FieldValue.increment(ADD_PAID),
          updatedAt: FieldValue.serverTimestamp(),
        });

        if (trialByCustomerRef) {
          tx.set(
            trialByCustomerRef,
            { used: true, apiKeyHash, emailHash, usedAt: FieldValue.serverTimestamp(), reason: "coupon_free" },
            { merge: true }
          );
        }
        if (trialByEmailRef) {
          tx.set(
            trialByEmailRef,
            { used: true, apiKeyHash, customerId, usedAt: FieldValue.serverTimestamp(), reason: "coupon_free" },
            { merge: true }
          );
        }

        tx.set(evRef, {
          type: event.type,
          customerId: customerId || null,
          apiKeyHash,
          amount: ADD_PAID,
          reason: "coupon_free",
          trial: false,
          createdAt: FieldValue.serverTimestamp(),
        });

        // debug in-tx
        tx.set(
          dbgRef,
          {
            step: "done",
            mode: "coupon_free",
            vercelEnv: process.env.VERCEL_ENV || "unknown",
            projectUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "unknown",
            commitSha: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
            commitMsg: process.env.VERCEL_GIT_COMMIT_MESSAGE || "unknown",
            at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return;
      }

      // --- 純トライアル無料 ---
      if (isTrialFree) {
        const alreadyByEmail = trialByEmailRef ? (await tx.get(trialByEmailRef)).exists : false;
        const alreadyByCust = trialByCustomerRef ? (await tx.get(trialByCustomerRef)).exists : false;
        if (alreadyByEmail || alreadyByCust) {
          tx.set(evRef, {
            type: event.type,
            note: "trial_already_used",
            customerId: customerId || null,
            apiKeyHash,
            createdAt: FieldValue.serverTimestamp(),
          });
          return;
        }

        const snap = await tx.get(keyRef);
        const paidBefore = (snap.data()?.paid ?? 0) as number;

        tx.update(keyRef, {
          paid: FieldValue.increment(ADD_PAID),
          updatedAt: FieldValue.serverTimestamp(),
        });

        if (trialByCustomerRef) {
          tx.set(
            trialByCustomerRef,
            { used: true, apiKeyHash, emailHash, usedAt: FieldValue.serverTimestamp(), reason: "trial_free" },
            { merge: true }
          );
        }
        if (trialByEmailRef) {
          tx.set(
            trialByEmailRef,
            { used: true, apiKeyHash, customerId, usedAt: FieldValue.serverTimestamp(), reason: "trial_free" },
            { merge: true }
          );
        }

        tx.set(evRef, {
          type: event.type,
          customerId,
          apiKeyHash,
          amount: ADD_PAID,
          reason: "trial_free",
          trial: true,
          createdAt: FieldValue.serverTimestamp(),
        });

        // debug in-tx
        tx.set(
          dbgRef,
          {
            step: "done",
            mode: "trial_free",
            vercelEnv: process.env.VERCEL_ENV || "unknown",
            projectUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "unknown",
            commitSha: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
            commitMsg: process.env.VERCEL_GIT_COMMIT_MESSAGE || "unknown",
            paid_before: paidBefore,
            paid_delta: ADD_PAID,
            paid_after_expected: paidBefore + ADD_PAID,
            at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return;
      }

      // --- 有料（100円） ---
      {
        const snap = await tx.get(keyRef);
        const paidBefore = (snap.data()?.paid ?? 0) as number;

        tx.update(keyRef, {
          paid: FieldValue.increment(ADD_PAID),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.set(evRef, {
          type: event.type,
          customerId: customerId || null,
          apiKeyHash,
          amount: ADD_PAID,
          reason: "paid",
          trial: false,
          createdAt: FieldValue.serverTimestamp(),
        });

        // debug in-tx
        tx.set(
          dbgRef,
          {
            step: "done",
            mode: "paid",
            vercelEnv: process.env.VERCEL_ENV || "unknown",
            projectUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "unknown",
            commitSha: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
            commitMsg: process.env.VERCEL_GIT_COMMIT_MESSAGE || "unknown",
            paid_before: paidBefore,
            paid_delta: ADD_PAID,
            paid_after_expected: paidBefore + ADD_PAID,
            at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }); // ← ← ← runTransaction はここで確実に閉じる

    // トランザクション外の最終ログ
    await dbgRef.set(
      {
        step: "finalized",
        mode: isPaid ? "paid" : isCouponFree ? "coupon_free" : "trial_free",
        vercelEnv: process.env.VERCEL_ENV || "unknown",
        projectUrl:
          process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "unknown",
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
        commitMsg: process.env.VERCEL_GIT_COMMIT_MESSAGE || "unknown",
        at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return json({ ok: true }, 200);
  } catch (e: unknown) {
    const msg = (e as { message?: string })?.message ?? "internal error";
    await dbgRef.set(
      { step: "error", error: msg, at: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return json({ ok: false, error: msg }, 500);
  }
}
