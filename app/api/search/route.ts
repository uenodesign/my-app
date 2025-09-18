// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

type SearchBody = {
  keyword: string;
  location: string;
  apiKey: string;
};

type TextSearchPlace = {
  place_id: string;
  name?: string;
  formatted_address?: string;
  rating?: number;
};

type TextSearchResponse = {
  results: TextSearchPlace[];
  next_page_token?: string;
  status: string;
};

type PlaceDetails = {
  name?: string;
  website?: string;
  formatted_phone_number?: string;
  formatted_address?: string;
  rating?: number;
};

type PlaceDetailsResponse = {
  result?: PlaceDetails;
  status: string;
};

type ResultItem = {
  番号: number;
  店舗名: string;
  住所: string;
  電話番号: string;
  評価: number | null;
  サイトリンク: string | "サイトなし";
  メールアドレス: string | null;
  インスタグラム: string | null;
  検索キーワード: string;
  検索地域: string;
};

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function cleanAddress(addr?: string): string {
  if (!addr) return "住所不明";
  // 「日本」「〒xxxx-xxxx」を除去 & 先頭の句読点/空白を除去
  let s = addr
    .replace(/日本/g, "")
    .replace(/〒[0-9\-]+/g, "")
    .trim();
  s = s.replace(/^[、\s]+/, "");
  return s || "住所不明";
}

function pickMainInstagram(urls: string[]): string | null {
  const unique = Array.from(new Set(urls));
  // /p/ (投稿)や/reel/は個別投稿なので除外し、/profiles/ も避け、ユーザープロファイルらしいものを優先
  const candidates = unique.filter((u) => {
    try {
      const uo = new URL(u);
      if (!uo.hostname.includes("instagram.com")) return false;
      const p = uo.pathname;
      if (p.startsWith("/p/") || p.startsWith("/reel/") || p.startsWith("/explore/")) return false;
      return true;
    } catch {
      return false;
    }
  });
  return candidates[0] ?? unique[0] ?? null;
}

function pickMainEmail(emails: string[]): string | null {
  const blocked = ["example.com", "localhost", "test.com"];
  const normalized = emails
    .map((e) => e.trim())
    .filter((e) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(e))
    .filter((e) => !blocked.some((b) => e.endsWith(`@${b}`)));
  return Array.from(new Set(normalized))[0] ?? null;
}

async function extractFromWebsite(url: string): Promise<{ email: string | null; instagram: string | null }> {
  try {
    if (!url || url === "サイトなし") return { email: null, instagram: null };
    const res = await axios.get<string>(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000,
      responseType: "text",
      validateStatus: () => true,
    });
    if (res.status < 200 || res.status >= 300) return { email: null, instagram: null };

    const html = res.data ?? "";
    const $ = cheerio.load(html);

    // メール
    const text = $.text();
    const emailMatches = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];

    // インスタ
    const instaUrls: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("instagram.com")) {
        // 相対→絶対はサイトURLベースでもOKだが、だいたい絶対URLが多いのでそのまま
        instaUrls.push(href);
      }
    });

    const email = pickMainEmail(instaUrls.length ? emailMatches : emailMatches); // （単純化）メール抽出
    const instagram = pickMainInstagram(instaUrls);
    return { email, instagram };
  } catch {
    return { email: null, instagram: null };
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 型チェック（最小限）
  const { keyword, location, apiKey } = body as Partial<SearchBody>;
  if (!keyword || !location || !apiKey) {
    return NextResponse.json({ error: "keyword, location, apiKey は必須です" }, { status: 400 });
  }

  const query = `${keyword} ${location}`;
  const base = "https://maps.googleapis.com/maps/api/place";

  async function textSearch(pageToken?: string): Promise<TextSearchResponse> {
    const url = new URL(`${base}/textsearch/json`);
    url.searchParams.set("query", query);
    url.searchParams.set("language", "ja");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pagetoken", pageToken);

    const res = await axios.get<unknown>(url.toString(), { timeout: 10000 });
    // 最低限の型安全チェック
    if (typeof res.data === "object" && res.data !== null && "results" in res.data && Array.isArray((res.data as any).results)) {
      const data = res.data as TextSearchResponse;
      return data;
    }
    throw new Error("Unexpected TextSearch response");
  }

  async function details(placeId: string): Promise<PlaceDetails> {
    const url = new URL(`${base}/details/json`);
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("language", "ja");
    url.searchParams.set("fields", "name,website,formatted_phone_number,formatted_address,rating");
    url.searchParams.set("key", apiKey);

    const res = await axios.get<unknown>(url.toString(), { timeout: 10000 });
    if (typeof res.data === "object" && res.data !== null && "result" in res.data) {
      const data = res.data as PlaceDetailsResponse;
      return data.result ?? {};
    }
    return {};
  }

  try {
    const all: TextSearchPlace[] = [];
    const first = await textSearch();
    all.push(...first.results);

    let token = first.next_page_token;
    let page = 1;
    while (token && page < 3) {
      await sleep(2000); // Google の仕様上、少し待たないと 2ページ目が  INVALID_REQUEST になる
      const next = await textSearch(token);
      all.push(...next.results);
      token = next.next_page_token;
      page += 1;
    }

    const results: ResultItem[] = [];
    for (let i = 0; i < all.length; i++) {
      const p = all[i];
      const placeId = p.place_id;
      const d = await details(placeId);

      const name = d.name ?? p.name ?? "名前不明";
      const address = cleanAddress(d.formatted_address ?? p.formatted_address ?? "住所不明");
      const rating: number | null = typeof (d.rating ?? p.rating) === "number" ? (d.rating ?? p.rating)! : null;
      const website = d.website ?? "サイトなし";
      const phone = d.formatted_phone_number ?? "電話番号なし";

      const { email, instagram } = await extractFromWebsite(website);

      results.push({
        番号: i + 1,
        店舗名: name,
        住所: address,
        電話番号: phone,
        評価: rating,
        サイトリンク: website,
        メールアドレス: email,
        インスタグラム: instagram,
        検索キーワード: keyword,
        検索地域: location,
      });
    }

    // 評価降順に並べ替え（null は最後）
    results.sort((a, b) => {
      const ar = a.評価 ?? -Infinity;
      const br = b.評価 ?? -Infinity;
      return br - ar;
    });

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: `search failed: ${message}` }, { status: 500 });
  }
}
