// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";
import pLimit from "p-limit";
import { cookies } from "next/headers";
import { normalizeApiKey as normalizeApiKeyFromLib } from "@/lib/normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

// === APIキー正規化（小文字化しない。全角/空白/引用符だけ除去）===
function normalizeApiKey(raw: string): string {
  return String(raw).trim().replace(/[\s\u3000]+/g, "").replace(/^["']+|["']+$/g, "");
}
// lib/normalize があれば優先
const normalize = (s: string) => {
  try {
    return normalizeApiKeyFromLib ? normalizeApiKeyFromLib(s) : normalizeApiKey(s);
  } catch {
    return normalizeApiKey(s);
  }
};

// ------------------------------------
// 設定値
// ------------------------------------
const PER_RUN_FREE = 20;
const PER_RUN_PAID = 40;
const CHUNK_SIZE = 40;
const CONCURRENCY = 6;
const OVERALL_TIMEOUT_MS = 25_000;
const SCRAPE_TIMEOUT_MS = 5_000;
const SCRAPE_MAX_TOTAL = 12;

// ------------------------------------
// 型
// ------------------------------------
type PlaceDetail = {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number | null;
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

type NewPlaceLite = {
  id: string;
  name: string;
  formatted_address: string;
  rating: number | null;
  website?: string;
  international_phone_number?: string;
};

type SearchTextResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    websiteUri?: string;
    internationalPhoneNumber?: string;
  }>;
  nextPageToken?: string;
};

type MaybeError = { message?: string };
function getErrorMessage(x: unknown): string | undefined {
  return typeof x === "object" && x && "message" in x && typeof (x as MaybeError).message === "string"
    ? (x as MaybeError).message
    : undefined;
}

// ------------------------------------
// ユーティリティ
// ------------------------------------
const limit = pLimit(CONCURRENCY);

function normalizePhoneJP(phone?: string | null): string {
  if (!phone) return "";
  return String(phone)
    .trim()
    // "+81", "+81 " , "+81- " などをすべて "0" に
    .replace(/^\+81[\s\u00A0-]*/u, "0")
    // 念のため、"0 "（0の直後の空白/NBSP）を排除
    .replace(/^0[\s\u00A0]+/u, "0")
    // 全角数字→半角
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}


function sanitizeAddress(addr?: string): string {
  const a = String(addr ?? "住所不明")
    .replace(/日本/g, "")
    .replace(/〒[0-9\-]+/g, "")
    .replace(/^、+/, "")
    .trim();
  return a.length ? a : "住所不明";
}

// 👇 ここから追加（ソーシャルURL判定）
const SOCIAL_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "facebook.com",
  "www.facebook.com",
  "x.com",
  "twitter.com",
  "www.twitter.com",
  "linktr.ee",
  "lit.link",
  "litlink.jp",
]);

function classifyUrl(url?: string | null) {
  if (!url) return { isSocial: false, isInstagram: false, host: "", url: null as string | null };
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const isSocial = SOCIAL_HOSTS.has(host);
    const isInstagram = /(^|\.)instagram\.com$/i.test(host);
    return { isSocial, isInstagram, host, url };
  } catch {
    return { isSocial: false, isInstagram: false, host: "", url: url ?? null };
  }
}



function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function scrapeMeta(website: string, signal?: AbortSignal): Promise<{ email: string | null; insta: string | null }> {
  try {
    const res = await axios.get(website, {
      headers: { "User-Agent": "Mozilla/5.0 (+search.uenodesign.site)" },
      timeout: SCRAPE_TIMEOUT_MS,
      validateStatus: () => true,
      signal,
    });
    if (res.status !== 200 || !res.data) return { email: null, insta: null };

    const $ = cheerio.load(String(res.data));
    const text = $("body").text();
    const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    const instaLink = $('a[href*="instagram.com"]').first().attr("href");
    return { email: emailMatch ? emailMatch[0] : null, insta: instaLink ?? null };
  } catch {
    return { email: null, insta: null };
  }
}

function isAbortError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const rec = e as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name : "";
  const message = typeof rec.message === "string" ? rec.message : "";
  return name === "AbortError" || message.toLowerCase().includes("abort");
}

// ===== Places API (New) =====
type GErrorDetail = { ["@type"]?: string; [k: string]: unknown };
type GErrorInfo = GErrorDetail & { reason?: string; domain?: string; metadata?: Record<string, string> };
type GErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: GErrorDetail[];
  };
};

function toJapaneseErrorMessage(statusCode: number, body: GErrorBody | null): string {
  const message = body?.error?.message ?? "";
  const details = body?.error?.details ?? [];
  const findDetail = (kw: string) =>
    details.find((d) => typeof d?.["@type"] === "string" && String(d["@type"]).includes(kw));

  if (statusCode === 403) {
    const errInfo = findDetail("ErrorInfo") as GErrorInfo | undefined;
    const reason = (errInfo?.reason ?? "").toUpperCase();
    if (reason === "SERVICE_DISABLED") {
      return `このプロジェクトで「Places API (New)」が有効化されていません。Google Cloud コンソールで places.googleapis.com を有効化してください。`;
    }
    if (reason === "API_KEY_RESTRICTIONS" || /API key|referrer|ip/i.test(message)) {
      return `APIキーの制限（HTTPリファラ / IP / API制限）が原因です。ドメイン（例 https://search.uenodesign.site/*）を登録し、API制限を「Places API (New)」のみにしてください。`;
    }
    if (reason === "BILLING_DISABLED" || /billing/i.test(message)) {
      return "課金アカウントが有効化されていません。Google Cloud で請求先を有効にしてください。";
    }
    if (reason === "RATE_LIMIT_EXCEEDED" || /quota|rate limit|exceeded/i.test(message)) {
      return "クォータ超過です。時間をおいて再試行するか、クォータを引き上げてください。";
    }
    if (reason === "API_KEY_INVALID" || /invalid api key/i.test(message)) {
      return "APIキーが無効です。入力ミス・失効を確認してください。";
    }
    return `権限不足（403）。${message ?? ""}`;
  }

  if (statusCode === 400) return `リクエストが不正です（400）。${message || "パラメータを確認してください。"}`;
  if (statusCode === 401) return "認証に失敗しました（401）。APIキーを確認してください。";
  if (statusCode === 429) return "リクエストが多すぎます（429）。時間をおいて再試行してください。";
  return `Places API (New) 呼び出しに失敗（HTTP ${statusCode}）。${message || ""}`;
}

async function textSearchNew(
  query: string,
  apiKey: string,
  limitCount: number = 40,
  signal?: AbortSignal
): Promise<NewPlaceLite[]> {
  const out: NewPlaceLite[] = [];
  let pageToken: string | undefined;

  const fieldMask =
    "places.id,places.displayName,places.formattedAddress,places.rating,places.websiteUri,places.internationalPhoneNumber,nextPageToken";

  while (out.length < limitCount) {
    const pageSize = Math.min(20, limitCount - out.length);
    const body = { textQuery: query, languageCode: "ja", pageSize, ...(pageToken ? { pageToken } : {}) };

    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": String(apiKey),
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      let j: GErrorBody | null = null;
      try {
        j = (await res.json()) as GErrorBody;
      } catch {
        j = null;
      }
      const jp = toJapaneseErrorMessage(res.status, j);
      throw new Error(jp);
    }

    const json: SearchTextResponse = await res.json();
    const items = Array.isArray(json.places) ? json.places : [];

    for (const p of items) {
      out.push({
        id: p.id ?? "",
        name: p.displayName?.text ?? "",
        formatted_address: p.formattedAddress ?? "",
        rating: typeof p.rating === "number" ? p.rating : null,
        website: p.websiteUri ?? undefined,
        international_phone_number: p.internationalPhoneNumber ?? undefined,
      });
      if (out.length >= limitCount) break;
    }

    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }

  return out;
}

async function fetchPlaceDetail(placeId: string, apiKey: string, signal?: AbortSignal): Promise<PlaceDetail> {
  const fields = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",          // ★追加
  "internationalPhoneNumber",
  "websiteUri",
  "rating"
].join(",");
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=${fields}&languageCode=ja`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "X-Goog-Api-Key": apiKey },
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Place Details (New) 失敗: HTTP ${res.status} ${text}`);
  }

  const data = await res.json();
return {
  name: data?.displayName?.text ?? "",
  formatted_address: data?.formattedAddress ?? "",
  // ★まずは国内表記を採用。無ければ国際表記。
  formatted_phone_number: data?.nationalPhoneNumber ?? data?.internationalPhoneNumber ?? "",
  website: data?.websiteUri ?? "",
  rating: typeof data?.rating === "number" ? data.rating : null,
};
}

// ------------------------------------
// Main
// ------------------------------------
export async function POST(req: NextRequest) {
  const ac = new AbortController();
  const overallTimer = setTimeout(() => ac.abort(), OVERALL_TIMEOUT_MS);

  let scrapedCount = 0;
  const canScrapeMore = () => scrapedCount < SCRAPE_MAX_TOTAL;
  const registerScrape = () => (scrapedCount += 1);

  try {
    // ===== 入力 =====
    type SearchBody = { q?: string; keyword?: string; location?: string; loc?: string; apiKey?: string };
    const raw = (await req.json().catch(() => ({}))) as SearchBody;

    const apiKeyInput = normalize(raw.apiKey ?? "");
    const qRaw = (raw.q ?? raw.keyword ?? "").toString().trim();
    const locRaw = (raw.location ?? raw.loc ?? "").toString().trim();
    const q = locRaw ? `${qRaw} ${locRaw}`.trim() : qRaw;

    const keywordForView = qRaw;
    const locationForView = locRaw;

    // ログ（キーはマスク）
    const maskKey = (s: string) => (s.length <= 8 ? "(short)" : `${s.slice(0, 4)}****${s.slice(-4)}`);
    try {
      console.log("[/api/search] apiKey(masked)=%s len=%d q=%s", maskKey(apiKeyInput), apiKeyInput.length, q);
    } catch {}

    // ===== 早期バリデーション =====
    if (!q) return NextResponse.json({ error: "INVALID_PARAMS", hint: "q または keyword/location が必要です。" }, { status: 400 });
    if (!apiKeyInput) return NextResponse.json({ error: "INVALID_API_KEY", hint: "apiKey が空です。" }, { status: 400 });

    // ===== APIキー台帳参照 =====
    const apiKeyHash = crypto.createHash("sha256").update(apiKeyInput).digest("hex");
    const refKey = adminDb.collection("credits_keys").doc(apiKeyHash);

    // （任意）旧 tokens.free を一度だけ移行したい場合はここで移行する
    // ※ 完全にAPIキー単位に統一するなら、このブロックを削除してOK
    let migrated = false;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("app_token")?.value ?? "";
      if (token) {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const refToken = adminDb.collection("credits_tokens").doc(tokenHash);

        await adminDb.runTransaction(async (tx) => {
          const [snapKey, snapToken] = await Promise.all([tx.get(refKey), tx.get(refToken)]);
          if (!snapKey.exists) {
            tx.set(refKey, { free: 0, paid: 0, createdAt: new Date() });
          }
          if (snapToken.exists) {
            const d = (snapToken.data() as { free?: number }) || {};
            const oldFree = Number(d.free ?? 0);
            if (oldFree > 0) {
              tx.update(refKey, { free: (snapKey.data()?.free ?? 0) + oldFree, updatedAt: new Date() });
              tx.update(refToken, { free: 0, updatedAt: new Date() });
              migrated = true;
            }
          }
        });
      }
    } catch {
      // cookies 取得不可でも処理続行
    }

    // ===== クレジット確認＆消費（keys.free/paid のみ）=====
    type ConsumeResult = {
      usePaid: boolean;
      perRun: number;
      remainingPaid: number;
      remainingFree: number;
    };

    const { usePaid, perRun, remainingPaid, remainingFree } = await adminDb.runTransaction<ConsumeResult>(async (tx) => {
      const snap = await tx.get(refKey);
      let paid = 0;
      let free = 0;

      if (!snap.exists) {
        tx.set(refKey, { free: 0, paid: 0, createdAt: new Date() });
      } else {
        const d = (snap.data() as { free?: unknown; paid?: unknown }) || {};
        paid = typeof d.paid === "number" && Number.isFinite(d.paid) ? d.paid : 0;
        free = typeof d.free === "number" && Number.isFinite(d.free) ? d.free : 0;
      }

      if (paid > 0) {
        paid -= 1;
        tx.update(refKey, { paid, updatedAt: new Date() });
        return { usePaid: true, perRun: PER_RUN_PAID, remainingPaid: paid, remainingFree: free };
      }

      if (free > 0) {
        free -= 1;
        tx.update(refKey, { free, updatedAt: new Date() });
        return { usePaid: false, perRun: PER_RUN_FREE, remainingPaid: paid, remainingFree: free };
      }

      throw new Response(
        JSON.stringify({
          error: "クレジットがありません。無料クーポンまたは追加購入をご利用ください。",
          migrated, // 直前に移行を試みたかどうかのヒント
        }),
        { status: 402 }
      );
    });

    // ===== Google Places Text Search =====
    const placesNew = await textSearchNew(q, apiKeyInput, perRun ?? PER_RUN_FREE, ac.signal);

    // ===== 詳細＋スクレイピング =====
    const target = placesNew.map((p) => ({
      placeId: p.id,
      name: p.name,
      address: p.formatted_address,
      rating: p.rating ?? null,
      website: p.website ?? "",
      phone: p.international_phone_number ?? "",
    }));

    const chunks = chunk(target, CHUNK_SIZE);
    const results: ResultRow[] = [];

    for (const [ci, c] of chunks.entries()) {
      if (ac.signal.aborted) break;

      const rows = await Promise.allSettled<ResultRow>(
        c.map((p, idx) =>
          limit(async () => {
   const det = await fetchPlaceDetail(p.placeId, apiKeyInput, ac.signal);

// ① まずは詳細のURLを取得
const websiteRaw = det.website || "";
const site = classifyUrl(websiteRaw);

// ② 出力用の変数を用意
let homepage: string | null = null;
let email: string | null = null;
let insta: string | null = null;

// ③ Instagram等のソーシャルなら、ホームページ欄には入れない
if (site.isSocial) {
  if (site.isInstagram) {
    insta = site.url; // インスタ欄へ
  }
  // Facebook/X/Linktree等は、必要なら別欄を作る。今は非表示のままでもOK
} else {
  // ④ 自社サイトっぽいドメインならホームページ欄へ
  homepage = site.url;

  // ⑤ 公式サイト内のリンクから Instagram と email を拾う（既存のスクレイプを活用）
  if (homepage && canScrapeMore()) {
    const meta = await scrapeMeta(homepage, ac.signal);
    registerScrape();
    email = meta.email;
    // 既に insta が入っていなければ、サイト内リンクから補完
    insta = insta || meta.insta || null;
  }
}

// ⑥ 行の生成（ホームページ/インスタの値を差し替え）
const addr = sanitizeAddress(det.formatted_address);
const rating = det.rating ?? null;

const row: ResultRow = {
  番号: ci * CHUNK_SIZE + (idx + 1),
  店舗名: det.name ?? "名前不明",
  住所: addr,
  電話番号: normalizePhoneJP(det.formatted_phone_number) || "電話番号なし",
  評価: rating,
  ホームページ: homepage,   // ★ここが再分類後の値
  メール: email,
  インスタグラム: insta,     // ★ここも再分類後の値
  検索キーワード: keywordForView,
  地域: locationForView,
};
return row;

          })
        )
      );

      for (const r of rows) {
        if (r.status === "fulfilled") {
          results.push(r.value);
        } else {
          const reason =
            typeof r.reason === "object" &&
            r.reason !== null &&
            "message" in r.reason &&
            typeof (r.reason as { message?: unknown }).message === "string"
              ? (r.reason as { message: string }).message
              : String(r.reason ?? "");
          console.warn("[details worker] rejected:", reason);
        }
      }
    }

    // ===== レスポンス =====
    return NextResponse.json({
      mode: usePaid ? "paid" : "free",
      perRun,
      remaining: {
        paid: remainingPaid,
        free: remainingFree,
        total: remainingPaid + remainingFree,
      },
      count: results.length,
      results,
    });
  } catch (e: unknown) {
    if (e instanceof Response) return e as Response;

    const msg = isAbortError(e)
      ? "タイムアウトしました。条件を絞って再実行してください。"
      : getErrorMessage(e) ?? "Internal Error";

    console.error("検索APIエラー:", e);
    return NextResponse.json({ error: msg }, { status: isAbortError(e) ? 504 : 500 });
  } finally {
    clearTimeout(overallTimer);
  }
}
