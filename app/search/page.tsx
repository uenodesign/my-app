// app/search/page.tsx
"use client";
import { useEffect, useState } from "react";

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

export default function SearchPage() {
  // 入力フォーム
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [apiKey, setApiKey] = useState("");

  // 結果＆状態
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastMode, setLastMode] = useState<"free" | "paid" | null>(null);
  const [remaining, setRemaining] = useState<{ free: number; paid: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // キー保存（任意）
  const [rememberKey, setRememberKey] = useState(true);
  const LS_KEY = "searchpro.apiKey";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setApiKey(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      // 保存/削除
      try {
        if (rememberKey) localStorage.setItem(LS_KEY, apiKey);
        else localStorage.removeItem(LS_KEY);
      } catch {}

      const r = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyword, location, apiKey }),
      });
      const j = await r.json();
      if (!r.ok) {
        throw new Error(j?.error || "検索に失敗しました");
      }

      setRows(Array.isArray(j.results) ? j.results : []);
      setLastMode(j.mode === "paid" ? "paid" : "free");
      setRemaining(j.remaining ? { free: j.remaining.free ?? 0, paid: j.remaining.paid ?? 0 } : null);
    } catch (e) {
      const msg = (e as { message?: string })?.message || "エラーが発生しました。時間をおいて再試行してください。";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-4">
      {/* 入力フォーム */}
      <form
        className="grid grid-cols-1 md:grid-cols-4 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
      >
        <input
          className="rounded px-3 py-2 text-black"
          placeholder="キーワード（例：美容室）"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <input
          className="rounded px-3 py-2 text-black"
          placeholder="地域（例：渋谷）"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          className="rounded px-3 py-2 text-black"
          placeholder="Google APIキー"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !keyword || !apiKey}
          className="rounded px-4 py-2 bg-white text-black font-medium disabled:opacity-60"
        >
          {loading ? "検索中…" : "検索する"}
        </button>

        <label className="md:col-span-4 flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            className="accent-white"
            checked={rememberKey}
            onChange={(e) => setRememberKey(e.target.checked)}
            title="この端末のブラウザにAPIキーを保存します"
          />
          この端末にAPIキーを保存
        </label>
      </form>

      {/* 実行結果バッジ & 残数表示 */}
      <div className="text-sm text-neutral-300 space-x-3">
        {lastMode && (
          <span
            className={`px-2 py-1 rounded ${
              lastMode === "paid" ? "bg-emerald-200 text-emerald-900" : "bg-sky-200 text-sky-900"
            }`}
          >
            今回: {lastMode === "paid" ? "有料（40件）" : "無料（20件）"}
          </span>
        )}
        {remaining && (
          <span>
            残数：無料 {remaining.free} / 有料 {remaining.paid}
          </span>
        )}
      </div>

      {error && <div className="text-red-300 text-sm">{error}</div>}

      {rows.length === 0 ? (
        <p className="text-gray-400">結果なし</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr>
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">店舗名</th>
                <th className="py-2 pr-4">住所</th>
                <th className="py-2 pr-4">電話番号</th>
                <th className="py-2 pr-4">評価</th>
                <th className="py-2 pr-4">HP</th>
                <th className="py-2 pr-4">メール</th>
                <th className="py-2 pr-4">インスタ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.番号} className="border-t border-neutral-800">
                  <td className="py-2 pr-4">{r.番号}</td>
                  <td className="py-2 pr-4">{r.店舗名}</td>
                  <td className="py-2 pr-4">{r.住所}</td>
                  <td className="py-2 pr-4">{r.電話番号}</td>
                  <td className="py-2 pr-4">{r.評価 ?? "-"}</td>
                  <td className="py-2 pr-4">
                    {r.ホームページ ? (
                      <a className="underline" href={r.ホームページ} target="_blank" rel="noopener noreferrer">
                        link
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 pr-4">{r.メール ?? "-"}</td>
                  <td className="py-2 pr-4">
                    {r.インスタグラム ? (
                      <a className="underline" href={r.インスタグラム} target="_blank" rel="noopener noreferrer">
                        @insta
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

      {/* APIキーの明示削除 */}
      <div>
        <button
          className="text-xs underline text-neutral-400"
          onClick={() => {
            try {
              localStorage.removeItem(LS_KEY);
              setApiKey("");
            } catch {}
          }}
        >
          APIキーを端末から削除
        </button>
      </div>
    </main>
  );
}
