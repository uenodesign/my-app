// app/page.tsx（あなたの現行コードにフッターだけ追加）
"use client";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

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

  const headerRight = useMemo(() => {
    const t = remainTotal != null ? `${remainTotal}回` : "-";
    const detail = (remainPaid ?? 0) + (remainFree ?? 0) > 0 ? `（有料${remainPaid ?? 0}・無料${remainFree ?? 0}）` : "";
    return `今の残り：${t} ${detail}`;
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
      setRows(data.results || []);
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
    const lines = [headers.join(",")].concat(rows.map((r) => [r.番号, r.店舗名, r.住所, r.電話番号, r.評価 ?? "", r.ホームページ ?? "", r.メール ?? "", r.インスタグラム ?? "", r.検索キーワード, r.地域].map((v) => (typeof v === "string" && v.includes(",") ? `"${v.replace(/"/g, '""')}"` : String(v))).join(",")));
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `search_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "結果");
    XLSX.writeFile(wb, `search_${Date.now()}.xlsx`);
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Google Places 検索ツール</h1>
        <span className="text-sm text-gray-300">{headerRight}</span>
      </header>

      <section className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="検索キーワード（例：美容室、カフェ、パーソナルジム）" className="w-full px-4 py-3 rounded-lg bg-neutral-800 placeholder-gray-400 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="地域（例：◯◯市）" className="w-full px-4 py-3 rounded-lg bg-neutral-800 placeholder-gray-400 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="APIキーワード（Google Places API Key）" className="w-full px-4 py-3 rounded-lg bg-neutral-800 placeholder-gray-400 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="mt-4 flex justify-center">
          <button onClick={fetchSearch} disabled={loading} className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
            {loading ? "検索中…" : "検索実行"}
          </button>
        </div>
        {error && <p className="mt-2 text-red-400 text-sm text-center">{error}</p>}

        {loading && (
          <div className="mt-4">
            <div className="h-2 w-full bg-gray-800 rounded overflow-hidden">
              <div className="h-2 w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] bg-gray-300" />
            </div>
            <p className="text-sm text-gray-400 mt-2">
              処理中…{mode ? `（${mode === "paid" ? "有料60件" : "無料10件"}モード）` : ""}
              {perRun ? ` / 取得上限 ${perRun}件` : ""}
            </p>
          </div>
        )}
      </section>

      <section className="mt-6">
        {rows.length > 0 ? (
          <>
            <div className="overflow-x-auto border border-neutral-800 rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-900">
                  <tr>
                    {["番号", "店舗名", "住所", "電話番号", "評価", "ホームページ", "メール", "インスタグラム", "検索キーワード", "地域"].map((h) => (
                      <th key={h} className="px-3 py-2 text-center font-semibold text-gray-300 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.番号} className="odd:bg-neutral-900/40">
                      <td className="px-3 py-2 text-center">{r.番号}</td>
                      <td className="px-3 py-2">{r.店舗名}</td>
                      <td className="px-3 py-2">{r.住所}</td>
                      <td className="px-3 py-2">{r.電話番号}</td>
                      <td className="px-3 py-2 text-center">{r.評価 ?? ""}</td>
                      <td className="px-3 py-2 text-blue-400 underline break-all">
                        {r.ホームページ ? (
                          <a href={r.ホームページ} target="_blank">
                            ホームページ
                          </a>
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="px-3 py-2 break-all">{r.メール ?? ""}</td>
                      <td className="px-3 py-2 text-blue-400 underline break-all">
                        {r.インスタグラム ? (
                          <a href={r.インスタグラム} target="_blank">
                            インスタグラム
                          </a>
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="px-3 py-2">{r.検索キーワード}</td>
                      <td className="px-3 py-2">{r.地域}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={downloadXLSX} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700">
                エクセル
              </button>
              <button onClick={downloadCSV} className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">
                CSV
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-400">検索結果がここに表示されます。</p>
        )}
      </section>

      <section className="mt-10 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">使い方</h2>
          <ol className="list-decimal list-inside text-gray-300 space-y-1">
            <li>検索キーワード・地域・Google Places API キーを入力</li>
            <li>「検索実行」をクリック</li>
            <li>結果を確認し、必要に応じて「エクセル」または「CSV」で保存</li>
          </ol>
        </div>
        <div>
          <button onClick={() => (window.location.href = "/credits")} className="px-4 py-2 rounded bg-fuchsia-600 hover:bg-fuchsia-700">
            クレジット購入（5回 / 1,000円）
          </button>
        </div>
      </section>

      {/* ▼ フッター（特商法・利用規約・プライバシー） */}
      <footer className="mt-12 border-t border-neutral-800 pt-6 text-sm text-gray-400">
        <div className="flex flex-wrap gap-4">
          <a className="underline hover:text-gray-200" href="/legal/tokushoho">
            特定商取引法に基づく表記
          </a>
          <a className="underline hover:text-gray-200" href="/legal/terms">
            利用規約
          </a>
          <a className="underline hover:text-gray-200" href="/legal/privacy">
            プライバシーポリシー
          </a>
        </div>
      </footer>
    </main>
  );
}
