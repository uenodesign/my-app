"use client";

import { useState } from "react";

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

export default function Home() {
  const [keyword, setKeyword] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [error, setError] = useState<string>("");

  const handleSearch = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setError("");
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, location, apiKey }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { results: ResultItem[] };
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown";
      setError(`検索に失敗しました: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">🔍 Google Places データ抽出（Next.js）</h1>

      <form onSubmit={handleSearch} className="space-y-3 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input className="px-3 py-2 rounded border border-gray-700 bg-black placeholder-gray-400" placeholder="美容室、カフェ、パーソナルジムなど" value={keyword} onChange={(e) => setKeyword(e.target.value)} required />
          <input className="px-3 py-2 rounded border border-gray-700 bg-black placeholder-gray-400" placeholder="◯◯市など" value={location} onChange={(e) => setLocation(e.target.value)} required />
          <input className="px-3 py-2 rounded border border-gray-700 bg-black placeholder-gray-400" placeholder="Google Places API キー" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required />
        </div>
        <button type="submit" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50" disabled={loading}>
          {loading ? "検索中…" : "検索実行"}
        </button>
      </form>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {loading && (
        <div className="mt-4">
          <div className="h-2 w-full bg-gray-800 rounded overflow-hidden">
            <div className="h-2 w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] bg-gray-300" />
          </div>
          <p className="text-sm text-gray-400 mt-2">処理中…</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900">
                {["番号", "店舗名", "住所", "電話番号", "評価", "サイトリンク", "メールアドレス", "インスタグラム", "検索キーワード", "検索地域"].map((h) => (
                  <th key={h} className="px-3 py-2 border-b border-gray-800 text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.番号} className="hover:bg-gray-900/60">
                  <td className="px-3 py-2 text-center">{r.番号}</td>
                  <td className="px-3 py-2">{r.店舗名}</td>
                  <td className="px-3 py-2">{r.住所}</td>
                  <td className="px-3 py-2">{r.電話番号}</td>
                  <td className="px-3 py-2 text-center">{r.評価 ?? "-"}</td>
                  <td className="px-3 py-2">
                    {r.サイトリンク && r.サイトリンク !== "サイトなし" ? (
                      <a className="underline text-blue-300" target="_blank" rel="noreferrer" href={r.サイトリンク}>
                        ホームページ
                      </a>
                    ) : (
                      "サイトなし"
                    )}
                  </td>
                  <td className="px-3 py-2">{r.メールアドレス ?? "-"}</td>
                  <td className="px-3 py-2">
                    {r.インスタグラム ? (
                      <a className="underline text-blue-300" target="_blank" rel="noreferrer" href={r.インスタグラム}>
                        Instagram
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-2">{r.検索キーワード}</td>
                  <td className="px-3 py-2">{r.検索地域}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
