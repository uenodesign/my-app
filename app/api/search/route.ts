// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// 仕様：無料2回(10件)/有料5回(60件)
const PER_RUN_FREE = 10;
const PER_RUN_PAID = 60;

type TextSearchPlace = {
  place_id: string;
};

type PlaceDetail = {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
};

type ResultRow = {
  番号: number;
  店舗名: string;
  住所: string;
  電話番号: string;
  評価: number | null;
  ホームページ: string | null;
  メール: string | null;
  インスタグラム: string | null;
  検索キーワード: string;
  地域: string;
};

function hashKey(rawKey: string) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { keyword?: string; location?: string; apiKey?: string };
    const keyword = body.keyword ?? "";
    const location = body.location ?? "";
    const apiKey = body.apiKey ?? "";

    if (!keyword || !location || !apiKey) {
      return NextResponse.json({ error: "パラメータ不足です" }, { status: 400 });
    }

    const keyId = hashKey(apiKey);
    const ref = adminDb.collection("credits_keys").doc(keyId);

    // 1) 残高チェック（存在しなければ無料2回を自動付与）
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
        const d = snap.data() as { free?: number; paid?: number } | undefined;
        free = d?.free ?? 0;
        paid = d?.paid ?? 0;
      }

      if (paid > 0) {
        usePaid = true;
        perRun = PER_RUN_PAID;
      } else if (free > 0) {
        usePaid = false;
        perRun = PER_RUN_FREE;
      } else {
        throw new Response(JSON.stringify({ error: "クレジットがありません。下部の『クレジット購入』から追加してください。" }), { status: 402 });
      }
    });

    // 2) Google Places 検索（perRun件）
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

    const places = (textRes.data.results ?? []) as TextSearchPlace[];
    const sliced = places.slice(0, perRun);

    const results: ResultRow[] = [];

    for (let i = 0; i < sliced.length; i++) {
      const p = sliced[i];
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

      const d = (detailRes.data?.result ?? {}) as PlaceDetail;
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
            const $ = cheerio.load(siteRes.data as string);
            const text = $("body").text();
            const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
            if (emailMatch) email = emailMatch[0];
            const instaLink = $('a[href*="instagram.com"]').first().attr("href");
            if (instaLink) insta = instaLink;
          }
        } catch {
          /* ignore */
        }
      }

      const addr = String(d.formatted_address ?? "住所不明")
        .replace(/日本/g, "")
        .replace(/〒[0-9\-]+/g, "")
        .replace(/^、+/, "")
        .trim();

      const rating = d.rating ?? null;

      results.push({
        番号: i + 1,
        店舗名: d.name ?? "名前不明",
        住所: addr,
        電話番号: d.formatted_phone_number ?? "電話番号なし",
        評価: rating,
        ホームページ: website,
        メール: email,
        インスタグラム: insta,
        検索キーワード: keyword,
        地域: location,
      });
    }

    // 3) 成功後に 1 減算
    let remainingFree = 0;
    let remainingPaid = 0;

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = (snap.data() as { free?: number; paid?: number }) || {};
      let f = data.free ?? 0;
      let p = data.paid ?? 0;

      if (usePaid && p > 0) p -= 1;
      else if (!usePaid && f > 0) f -= 1;
      else throw new Response(JSON.stringify({ error: "クレジット不足（再試行してください）" }), { status: 409 });

      tx.set(ref, { free: f, paid: p }, { merge: true });
      remainingFree = f;
      remainingPaid = p;
    });

    return NextResponse.json({
      mode: usePaid ? "paid" : "free",
      perRun,
      remaining: { total: remainingFree + remainingPaid, free: remainingFree, paid: remainingPaid },
      results,
    });
  } catch (e: unknown) {
    if (e instanceof Response) return e;
    console.error("検索APIエラー:", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
