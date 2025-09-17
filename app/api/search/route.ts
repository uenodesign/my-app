// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

// POST { keyword, location, apiKey }
export async function POST(req: NextRequest) {
  try {
    const { keyword, location, apiKey } = await req.json();

    // 1) Google Places Text Search
    const query = `${keyword} ${location}`;
    const textUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";
    const textRes = await axios.get(textUrl, {
      params: { query, key: apiKey, language: "ja" },
    });

    const all = textRes.data.results ?? [];

    // 次ページ（最大3ページ）を追う
    let nextPageToken = textRes.data.next_page_token;
    let page = 1;
    while (nextPageToken && page < 3) {
      await new Promise((r) => setTimeout(r, 2000));
      const more = await axios.get(textUrl, {
        params: { query, key: apiKey, pagetoken: nextPageToken, language: "ja" },
      });
      all.push(...(more.data.results ?? []));
      nextPageToken = more.data.next_page_token;
      page++;
    }

    // 2) Place Details + Webスクレイピングでメール&Instagram抽出
    const detailUrl = "https://maps.googleapis.com/maps/api/place/details/json";
    const rows = [];
    for (let i = 0; i < all.length; i++) {
      const p = all[i];
      const place_id = p.place_id;

      let name = p.name ?? "名前不明";
      let address = p.formatted_address ?? "住所不明";
      let rating = p.rating ?? null;
      let phone = "";
      let website: string | null = null;
      let email: string | null = null;
      let instagram: string[] = [];

      try {
        const det = await axios.get(detailUrl, {
          params: {
            place_id,
            key: apiKey,
            language: "ja",
            fields: "name,formatted_address,formatted_phone_number,website",
          },
        });
        const r = det.data.result ?? {};
        name = r.name ?? name;
        address = r.formatted_address ?? address;
        phone = r.formatted_phone_number ?? "";
        website = r.website ?? null;

        // 住所をクリーン
        address = String(address)
          .replace(/日本/g, "")
          .replace(/〒\s*[0-9０-９]{3}(?:[-‐-–—ー－ｰ]?[0-9０-９]{4})/g, "")
          .replace(/^[、,，\s]+/, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        // Webスクレイピング（サーバー側ならOK）
        const candidates: string[] = [];
        if (website) candidates.push(website);

        // もし website があればHTMLから email / instagram を抽出
        if (website) {
          try {
            const html = await axios.get(website, { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } });
            const $ = cheerio.load(html.data);
            const text = $.text();

            // email
            const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
            email = emailMatch?.[0] ?? null;

            // instagram
            $("a[href]").each((_, el) => {
              const href = $(el).attr("href") || "";
              if (/instagram\.com/i.test(href)) {
                candidates.push(href);
              }
            });
          } catch {
            /* 無視して継続 */
          }
        }

        instagram = candidates.filter((u) => /instagram\.com/i.test(u));
        const siteLinks = candidates.filter((u) => /^https?:\/\//i.test(u) && !/instagram\.com/i.test(u));
        // website を最優先でサイトリンクに
        const site = website ? [website, ...siteLinks.filter((u) => u !== website)] : siteLinks;

        rows.push({
          番号: i + 1,
          店舗名: name,
          住所: address,
          電話番号: phone || "電話番号なし",
          評価: rating,
          サイトリンク: site, // ← 配列
          メールアドレス: email, // ← 文字列 or null
          インスタグラム: instagram, // ← 配列
          検索キーワード: keyword,
          検索地域: location,
        });
      } catch {
        continue;
      }
    }

    // レスポンスは配列そのまま返却（フロントは配列前提 or {results}両対応）
    return NextResponse.json(rows, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server error" }, { status: 500 });
  }
}
