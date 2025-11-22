// app/page.tsx
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";

import Image from "next/image";



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

  // 画像拡大用
  const [open, setOpen] = useState(false);

  // Escで閉じる＋背景スクロール抑止
  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);
  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onKey]);


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
        <h1 className="text-3xl font-bold">Search Pro</h1>
        <span className="text-sm text-neutral-500">{headerRight}</span>
      </header>

      <section className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="検索キーワード（例：カフェ、らーめん、美容院、など）" className="w-full px-4 py-3 rounded-lg bg-white text-[#1D1D1F] placeholder-neutral-400 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0076DF]" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="地域（例：◯◯市、など）" className="w-full px-4 py-3 rounded-lg bg-white text-[#1D1D1F] placeholder-neutral-400 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0076DF]" />
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="APIキー（Google Places API Key）" className="w-full px-4 py-3 rounded-lg bg-white text-[#1D1D1F] placeholder-neutral-400 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0076DF]" />
        </div>
        <div className="mt-4 flex justify-center">
          <button onClick={fetchSearch} disabled={loading} className="cursor-pointer px-6 py-3 rounded-lg bg-[#0076DF] text-white hover:opacity-90 disabled:opacity-60">
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
                    {["No", "名称", "住所", "電話番号", "評価", "ホームページ", "メール", "インスタグラム", "検索キーワード", "地域"].map((h) => (
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

            <div className="mt-5 mb-5 flex gap-3">
              <button onClick={downloadCSV} className="px-4 py-2 rounded-md bg-[#1D1D1F] text-[#E1E1E7] cursor-pointer">
                CSV保存
              </button>
            </div>
            <p className="mb-15 text-base text-neutral-600">※この画面を閉じると検索結果を再表示できませんので、必要に応じて保存してください。</p>
     
          </>
        ) : (
          <>
            {/* <p className="text-sm text-neutral-600">検索結果がここに表示されます。</p> */}

            {/* ▼ プレースホルダー：本番テーブルと同じ見た目（ゼブラも同様） */}
            {/* <div className="mt-4 rounded-xl border-2 border-dashed border-neutral-300 p-0 overflow-hidden bg-white/50">
              <table className="w-full text-left text-sm text-[#1D1D1F]">
                <thead className="bg-white">
                  <tr className="text-[#1D1D1F]">
                    {["No", "名称", "住所", "電話番号", "評価", "ホームページ", "メール", "インスタグラム", "検索キーワード", "地域"].map((h) => (
                      <th key={h} className="px-3 py-2 text-center font-semibold whitespace-nowrap border-b border-neutral-300">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody> */}
                  {/* ダミー3行（ゼブラ確認のための薄い行） */}
                  {/* {[1].map((i) => (
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
            </div> */}
          </>
        )}
      </section>

      

      <section className="mt-10 space-y-4">

 <h2 className="space-y-2 text-2xl font-semibold mt-12 mb-3 border-t border-neutral-300 pt-10">下記の画像のように、データを取得できます。</h2>
<button
  type="button"
  onClick={() => setOpen(true)}
  aria-label="画像を拡大表示"
  className="inline-block text-left mb-3"
>
  <Image
    src="/images/sample.png"
    alt="サンプル画像"
    width={600}
    height={400}
    className="w-full h-auto cursor-zoom-in"
    priority
  />
</button>
 <p className="mb-1 text-base text-neutral-600">※Googleマップ上で、評価の高い順に表示されます。</p>
 <p className="mb-1 text-base text-neutral-600">※Googleマップに掲載されている情報のみ取得が可能です。</p>
 <p className="mb-1 text-base text-neutral-600">※無料で最大200件の情報を取得できます。</p>
 <p className="mb-1 text-base text-neutral-600">※掲載件数が少ないキーワードの場合、上限の件数まで表示されないことがあります。</p>
 <p className="mb-12 text-base text-neutral-600">※ご希望どおりの結果が得られない場合でも、補償いたしかねますので、あらかじめご了承ください。</p>

        <div>
          <h2 className="text-2xl font-semibold mb-2">使い方</h2>
          <ol className="list-decimal list-inside text-lg text-neutral-700 space-y-3 mb-8">
            <li>「Google Places APIキー」を取得します（無料・約3分で完了）
               <a href="https://uenodesign.site/api" target="_blank" rel="noopener noreferrer" className="ml-2 underline" > ▶取得方法はこちらから </a></li>
            <li>「クレジットを追加する」をクリックします。</li>
            <li>「検索キーワード・地域・Google Places APIキー」を入力し、「検索実行」をクリックします。</li>
            <li>　検索結果を確認し、必要に応じて「CSV」で保存してください。</li>
          </ol>
        </div>
        <div>
          {/* <button onClick={() => (window.location.href = "/credits")} className="px-4 py-2 rounded bg-[#E1E1E7] text-[#1D1D1F] cursor-pointer">
            クレジット追加（5回分：1回40件 / 100円）
          </button> */}
          <button
  onClick={() => (window.location.href = "/credits")}
  className="cursor-pointer mb-5
    group inline-flex items-center gap-2 rounded-lg
    border border-zinc-300 bg-[#1D1D1F] text-[#E1E1E7]
    px-6 py-3 text-base font-semibold 
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
  クレジットを追加する

</button>
<br/>
  <p className="mb-1 text-base text-neutral-600">※初回：無料（自動でクーポン適用・カード登録不要）</p>
  <p className="mb-1 text-base text-neutral-600">※2回目以降：300円（20回分／1回40件まで）</p>
        </div>
      </section>


{open && (
  <div
    role="dialog"
    aria-modal="true"
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    onClick={() => setOpen(false)}
  >
    <div
      className="relative w-[100vw] h-[90vh] max-w-6xl"
      onClick={(e) => e.stopPropagation()}
    >
      <Image
        src="/images/sample.png"
        alt="サンプル画像（拡大）"
        fill
        className="object-contain select-none"
        sizes="90vw"
        priority
      />
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="閉じる"
        className="absolute top-3 right-3 rounded-md bg-white/90 hover:bg-white px-3 py-1 text-sm font-medium shadow"
      >
        ×
      </button>
    </div>
  </div>
)}


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
