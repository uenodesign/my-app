// app/search/page.tsx
"use client";

import { useState } from "react";

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!keyword || !location || !apiKey) {
      setError("キーワード・地域・APIキーをすべて入力してください");
      return;
    }
    setError("");
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, location, apiKey }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResults(data.results);
    } catch (err) {
      setError("検索中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-6">🔍 Google Places 検索ツール</h1>

      {/* 入力フォーム */}
      <div className="mb-6">
        <div className="flex gap-3 mb-4">
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="美容室、カフェ、パーソナルジムなど" className="flex-1 px-4 py-2 rounded bg-gray-200 text-black placeholder-gray-500" />
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="◯◯市など" className="flex-1 px-4 py-2 rounded bg-gray-200 text-black placeholder-gray-500" />
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Google Places APIキー" className="flex-1 px-4 py-2 rounded bg-gray-200 text-black placeholder-gray-500" />
        </div>
        <div className="flex justify-center">
          <button onClick={handleSearch} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded">
            🚀 検索実行
          </button>
        </div>
      </div>

      {/* エラーメッセージ */}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* ローディング */}
      {loading && <p className="text-gray-400">検索中...</p>}

      {/* 結果テーブル */}
      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border border-gray-700 text-sm">
            <thead>
              <tr className="bg-gray-800">
                <th className="px-2 py-1 border">番号</th>
                <th className="px-2 py-1 border">店舗名</th>
                <th className="px-2 py-1 border">住所</th>
                <th className="px-2 py-1 border">電話番号</th>
                <th className="px-2 py-1 border">評価</th>
                <th className="px-2 py-1 border">サイト</th>
                <th className="px-2 py-1 border">メール</th>
                <th className="px-2 py-1 border">Instagram</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="hover:bg-gray-900">
                  <td className="px-2 py-1 border text-center">{r.番号}</td>
                  <td className="px-2 py-1 border">{r.店舗名}</td>
                  <td className="px-2 py-1 border">{r.住所}</td>
                  <td className="px-2 py-1 border">{r.電話番号}</td>
                  <td className="px-2 py-1 border text-center">{r.評価 ?? "-"}</td>
                  <td className="px-2 py-1 border">
                    {r.サイトリンク ? (
                      <a href={r.サイトリンク} target="_blank" className="text-blue-400 underline">
                        サイト
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-2 py-1 border">{r.メールアドレス ?? "-"}</td>
                  <td className="px-2 py-1 border">
                    {r.インスタグラム ? (
                      <a href={r.インスタグラム} target="_blank" className="text-pink-400 underline">
                        Instagram
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
