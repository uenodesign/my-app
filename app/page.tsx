// app/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";

type Row = {
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

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [remainTotal, setRemainTotal] = useState<number | null>(null);
  const [remainFree, setRemainFree] = useState<number | null>(null);
  const [remainPaid, setRemainPaid] = useState<number | null>(null);
  const [perRun, setPerRun] = useState<number | null>(null);
  const [mode, setMode] = useState<"free" | "paid" | null>(null);

  // ★ 初回アクセス時にアプリ用トークンを自動発行（クッキーに保存）
  useEffect(() => {
    fetch("/api/token/new", { method: "POST", credentials: "include" }).catch(() => {});
  }, []);

  const headerRight = useMemo(() => {
    const t = remainTotal != null ? `${remainTotal}回` : "-";
    const detail = (remainPaid ?? 0) + (remainFree ?? 0) > 0 ? `（有料${remainPaid ?? 0}・無料${remainFree ?? 0}）` : "";
    return `クレジット残数：${t} ${detail}`;
  }, [remainTotal, remainFree, remainPaid]);

  const fetchSearch = async () => {
    setError(null);
    if (!keyword || !location || !apiKey) {
      setError("キーワード・地域・APIキーを入力してください");
      return;
    }
    setLoading(true);
    setRows([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, location, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "検索に失敗しました");
        return;
      }

      // ▼ 受け取った結果を「評価の高い順」に並べ替え、1から再採番
      const incoming = (data.results || []) as Row[];
      const sorted = [...incoming].sort((a, b) => {
        const av = a.評価 ?? -Infinity;
        const bv = b.評価 ?? -Infinity;
        return bv - av; // 降順
      });
      const reNumbered = sorted.map((r, i) => ({ ...r, 番号: i + 1 }));
      setRows(reNumbered);

      setMode(data.mode ?? null);
      setPerRun(data.perRun ?? null);
      if (data.remaining) {
        setRemainTotal(data.remaining.total ?? null);
        setRemainFree(data.remaining.free ?? null);
        setRemainPaid(data.remaining.paid ?? null);
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const headers = ["番号", "店舗名", "住所", "電話番号", "評価", "ホームページ", "メール", "インスタグラム", "検索キーワード", "地域"];
    const lines = [headers.join(",")].concat(rows.map((r) => [r.番号, r.店舗名, r.住所, r.電話番号, r.評価 ?? "", r.ホームページ ?? "", r.メール ?? "", r.インスタグラム ?? "", r.検索キーワード, r.地域].map((v) => (typeof v === "string" && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : String(v))).join(",")));
    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    a.download = `search_${stamp}.csv`; // 例: search_20251002_1904.csv

    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">検索ツールPro</h1>
        <span className="text-sm text-neutral-500">{headerRight}</span>
      </header>

      <section className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="検索キーワード（例：美容室、カフェ、パーソナルジム）" className="w-full px-4 py-3 rounded-lg bg-white text-[#1D1D1F] placeholder-neutral-400 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0076DF]" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="地域（例：◯◯市）" className="w-full px-4 py-3 rounded-lg bg-white text-[#1D1D1F] placeholder-neutral-400 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0076DF]" />
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="APIキー（Google Places API Key）" className="w-full px-4 py-3 rounded-lg bg-white text-[#1D1D1F] placeholder-neutral-400 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0076DF]" />
        </div>
        <div className="mt-4 flex justify-center">
          <button onClick={fetchSearch} disabled={loading} className="px-6 py-3 rounded-lg bg-[#0076DF] text-white hover:opacity-90 disabled:opacity-60">
            {loading ? "検索中…" : "検索実行"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-red-400 text-sm text-center">
            {(() => {
              const url = "https://console.cloud.google.com/apis/library/places.googleapis.com";
              if (error.includes(url)) {
                // URL以外の部分だけ表示し、リンクは任意のラベルで表示
                const msg = error.replace(url, "").replace(/リンク:\s*$/, "");
                return (
                  <>
                    {msg.trim()}{" "}
                    <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
                      Places API (New)有効化
                    </a>
                  </>
                );
              }
              return error;
            })()}
          </p>
        )}

        {loading && (
          <div className="mt-4">
            <div className="h-2 w-full bg-neutral-200 rounded overflow-hidden">
              <div className="h-2 w-1/3 animate-[pulse_1.2s_ease-in-out_infinite]" />
            </div>
            <p className="text-sm text-neutral-600 mt-2">
              処理中…{mode ? `（${mode === "paid" ? "有料" : "無料"}モード）` : ""}
              {perRun ? ` / 取得上限 ${perRun}件` : ""}
            </p>
          </div>
        )}
      </section>

      <section className="mt-6">
        {rows.length > 0 ? (
          <>
            <div className="overflow-x-auto border border-neutral-300 rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-white">
                  <tr>
                    {["番号", "店舗名", "住所", "電話番号", "評価", "ホームページ", "メール", "インスタグラム", "検索キーワード", "地域"].map((h) => (
                      <th key={h} className="px-3 py-2 text-center font-semibold text-[#1D1D1F] whitespace-nowrap border-b border-neutral-300">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.番号} className="odd:bg-[#F0F0F2] even:bg-white">
                      <td className="px-3 py-2 text-center border-b border-neutral-200">{r.番号}</td>
                      <td className="px-3 py-2 border-b border-neutral-200">{r.店舗名}</td>
                      <td className="px-3 py-2 border-b border-neutral-200">{r.住所}</td>
                      <td className="px-3 py-2 border-b border-neutral-200">{r.電話番号}</td>
                      <td className="px-3 py-2 text-center border-b border-neutral-200">{r.評価 ?? ""}</td>
                      <td className="px-3 py-2 text-center underline break-all border-b border-neutral-200">
                        {r.ホームページ ? (
                          <a href={r.ホームページ} target="_blank" rel="noreferrer">
                            ホームページ
                          </a>
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="px-3 py-2 break-all border-b border-neutral-200">{r.メール ?? ""}</td>
                      <td className="px-3 py-2 text-center underline break-all border-b border-neutral-200">
                        {r.インスタグラム ? (
                          <a href={r.インスタグラム} target="_blank" rel="noreferrer">
                            インスタグラム
                          </a>
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="px-3 py-2 text-center border-b border-neutral-200">{r.検索キーワード}</td>
                      <td className="px-3 py-2 text-center border-b border-neutral-200">{r.地域}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={downloadCSV} className="px-4 py-2 rounded bg-[#E1E1E7] text-[#1D1D1F] cursor-pointer">
                CSV
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-600">検索結果がここに表示されます。</p>

            {/* ▼ プレースホルダー：本番テーブルと同じ見た目（ゼブラも同様） */}
            <div className="mt-4 rounded-xl border-2 border-dashed border-neutral-300 p-0 overflow-hidden bg-white/50">
              <table className="w-full text-left text-sm text-[#1D1D1F]">
                <thead className="bg-white">
                  <tr className="text-[#1D1D1F]">
                    {["番号", "店舗名", "住所", "電話番号", "評価", "ホームページ", "メール", "インスタグラム", "検索キーワード", "地域"].map((h) => (
                      <th key={h} className="px-3 py-2 text-center font-semibold whitespace-nowrap border-b border-neutral-300">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* ダミー3行（ゼブラ確認のための薄い行） */}
                  {[1].map((i) => (
                    <tr key={i} className="odd:bg-[#F0F0F2] even:bg-white">
                      <td className="px-3 py-2 text-center text-transparent select-none border-b border-neutral-200">{i}</td>
                      <td className="px-3 py-2 text-transparent select-none border-b border-neutral-200">プレースホルダー</td>
                      <td className="px-3 py-2 text-transparent select-none border-b border-neutral-200">プレースホルダー</td>
                      <td className="px-3 py-2 text-transparent select-none border-b border-neutral-200">00-0000-0000</td>
                      <td className="px-3 py-2 text-center text-transparent select-none border-b border-neutral-200">0</td>
                      <td className="px-3 py-2 text-transparent select-none border-b border-neutral-200">https://example.com</td>
                      <td className="px-3 py-2 text-transparent select-none border-b border-neutral-200">mail@example.com</td>
                      <td className="px-3 py-2 text-transparent select-none border-b border-neutral-200">https://instagram.com/placeholder</td>
                      <td className="px-3 py-2 text-transparent select-none border-b border-neutral-200">キーワード</td>
                      <td className="px-3 py-2 text-transparent select-none border-b border-neutral-200">地域</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="mt-10 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">使い方</h2>
          <ol className="list-decimal list-inside text-neutral-700 space-y-1">
            <li>「検索キーワード」「地域」「Google Places API キー」を入力</li>
            <li>「検索実行」をクリック</li>
            <li>結果を確認し、必要に応じて「CSV」で保存</li>
          </ol>
        </div>
        <div>
          {/* <button onClick={() => (window.location.href = "/credits")} className="px-4 py-2 rounded bg-[#E1E1E7] text-[#1D1D1F] cursor-pointer">
            クレジット追加（5回分：1回40件 / 100円）
          </button> */}
          <button
  onClick={() => (window.location.href = "/credits")}
  className="
    group inline-flex items-center gap-2 rounded-xl
    border border-zinc-300 bg-gradient-to-b from-white to-zinc-100
    px-5 py-3 text-sm font-semibold text-zinc-900
    shadow-sm ring-1 ring-inset ring-black/5
    transition-all
    hover:-translate-y-0.5 hover:shadow-md
    active:translate-y-0 active:shadow-sm
    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
  "
  aria-label="クレジットを追加する"
>
  {/* アイコン（インラインSVG）—不要なら削除 */}
  {/* <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 opacity-70 group-hover:opacity-100">
    <path fill="currentColor" d="M19 7H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Zm0 2v2H5V9h14ZM5 15v-2h7v2H5Z"/>
  </svg> */}
  初回無料クーポンorクレジット追加
  <span className="font-normal text-zinc-600">(5回分：1回40件 / 100円)</span>
</button>
        </div>
      </section>

      {/* ▼ フッター（特商法・利用規約・プライバシー） */}
      <footer className="mt-12 border-t border-neutral-300 pt-6 text-sm text-neutral-600">
        <div className="flex justify-center flex-wrap gap-4">
          <a className="underline hover:text-[#1D1D1F]" href="/legal/tokushoho">
            特定商取引法に基づく表記
          </a>
          <a className="underline hover:text-[#1D1D1F]" href="/legal/terms">
            利用規約
          </a>
          <a className="underline hover:text-[#1D1D1F]" href="/legal/privacy">
            プライバシーポリシー
          </a>
        </div>
      </footer>
    </main>
  );
}
