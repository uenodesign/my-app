// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import { adminDb } from "@/lib/firebaseAdmin";
import { hashKey } from "@/lib/hash";

export const runtime = "nodejs";

// 仕様：初回アクセス時に free:2, paid:0 を自動付与
const PER_RUN_FREE = 10; // 無料枠 1実行あたり10件
const PER_RUN_PAID = 60; // 有料枠 1実行あたり60件

export async function POST(req: NextRequest) {
  try {
    const { keyword, location, apiKey } = await req.json();

    if (!keyword || !location || !apiKey) {
      return NextResponse.json({ error: "パラメータ不足です" }, { status: 400 });
    }

    const keyId = hashKey(apiKey);
    const ref = adminDb.collection("credits_keys").doc(keyId);

    // 1) 残高確認（無ければ付与）
    let usePaid = false;
    let perRun = PER_RUN_FREE;
    let free = 0;
    let paid = 0;

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        free = 2;
        paid = 0;
        tx.set(ref, { free, paid, createdAt: new Date() });
      } else {
        const d = snap.data() as { free?: number; paid?: number };
        free = d.free ?? 0;
        paid = d.paid ?? 0;
      }

      if (paid > 0) {
        usePaid = true;
        perRun = PER_RUN_PAID;
      } else if (free > 0) {
        usePaid = false;
        perRun = PER_RUN_FREE;
      } else {
        throw new Response(JSON.stringify({ error: "クレジットがありません。『クレジット購入』で追加してください。" }), { status: 402 });
      }
      // 減算は後で（成功時のみ）
    });

    // 2) Text Search
    const searchQuery = `${keyword} ${location}`;
    const textRes = await axios.get("https://maps.googleapis.com/maps/api/place/textsearch/json", {
      params: { query: searchQuery, key: apiKey, language: "ja" },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (textRes.status !== 200) {
      return NextResponse.json({ error: `Google Text Search エラー: HTTP ${textRes.status}` }, { status: 502 });
    }
    if (textRes.data?.status && textRes.data.status !== "OK") {
      return NextResponse.json({ error: `TextSearch API: ${textRes.data.status} / ${textRes.data.error_message ?? ""}` }, { status: 502 });
    }

    const places: any[] = (textRes.data.results ?? []).slice(0, perRun);
    const results: any[] = [];

    // 3) Details + スクレイピング（1件ずつ）
    for (let i = 0; i < places.length; i++) {
      const p = places[i];
      const placeId = p.place_id;

      const detailRes = await axios.get("https://maps.googleapis.com/maps/api/place/details/json", {
        params: {
          place_id: placeId,
          key: apiKey,
          language: "ja",
          fields: "name,formatted_address,formatted_phone_number,website,rating",
        },
        timeout: 15000,
        validateStatus: () => true,
      });

      if (detailRes.status !== 200) continue;
      if (detailRes.data?.status && detailRes.data.status !== "OK") continue;

      const d = detailRes.data?.result ?? {};
      let email: string | null = null;
      let insta: string | null = null;
      const website: string | null = d.website ?? null;

      if (website) {
        try {
          const siteRes = await axios.get(website, {
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 10000,
            validateStatus: () => true,
          });
          if (siteRes.status === 200) {
            const $ = cheerio.load(siteRes.data);
            const text = $("body").text();

            const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
            if (emailMatch) email = emailMatch[0];

            const instaLink = $('a[href*="instagram.com"]').first().attr("href");
            if (instaLink) insta = instaLink;
          }
        } catch {}
      }

      const addr = String(d.formatted_address ?? "住所不明")
        .replace(/日本/g, "")
        .replace(/〒[0-9\-]+/g, "")
        .replace(/^、+/, "")
        .trim();

      results.push({
        番号: i + 1,
        店舗名: d.name ?? "名前不明",
        住所: addr,
        電話番号: d.formatted_phone_number ?? "電話番号なし",
        評価: d.rating ?? null,
        ホームページ: website,
        メール: email,
        インスタグラム: insta,
        検索キーワード: keyword,
        地域: location,
      });
    }

    // 4) 成功後にクレジットを1消費（paid優先）
    let remainingFree = 0;
    let remainingPaid = 0;

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = (snap.data() as { free?: number; paid?: number }) || {};
      let f = data.free ?? 0;
      let p = data.paid ?? 0;

      if (usePaid && p > 0) {
        p -= 1;
      } else if (!usePaid && f > 0) {
        f -= 1;
      } else {
        throw new Response(JSON.stringify({ error: "クレジット不足（再試行してください）" }), { status: 409 });
      }

      tx.set(ref, { free: f, paid: p }, { merge: true });
      remainingFree = f;
      remainingPaid = p;
    });

    return NextResponse.json({
      mode: usePaid ? "paid" : "free",
      perRun,
      remaining: {
        total: remainingFree + remainingPaid,
        free: remainingFree,
        paid: remainingPaid,
      },
      results,
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error("検索APIエラー:", e?.message || e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
