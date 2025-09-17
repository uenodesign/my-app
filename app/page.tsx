"use client";
import { useState } from "react";

// 変なメール表記を正す & 厳格バリデーション
function sanitizeEmail(input: unknown): string | null {
  if (!input) return null;
  let s = Array.isArray(input) ? String(input[0] ?? "") : String(input);
  s = s.trim();
  if (!s) return null;

  s = s.replace(/^mailto:/i, "");
  s = s.replace(/[　\s]+/g, "");
  s = s.replace(/（/g, "(").replace(/）/g, ")");
  s = s.replace(/．/g, ".").replace(/－/g, "-").replace(/＠/g, "@");
  s = s.replace(/\(at\)|\[at\]|\bat\b/gi, "@");
  s = s.replace(/\(dot\)|\[dot\]|\bdot\b/gi, ".");
  s = s.replace(/[\s\.,;:、。)\]]+$/g, "");

  const re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!re.test(s)) return null;
  if (/\.\./.test(s)) return null;

  return s.toLowerCase();
}

function LoadingBar() {
  return (
    <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden relative mb-6">
      <div className="absolute inset-0 animate-[loading_3s_linear_infinite]">
        <div className="bg-blue-500 h-4 w-1/3 rounded-full"></div>
      </div>
      <style jsx>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(300%);
          }
        }
      `}</style>
    </div>
  );
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, location, apiKey }),
      });

      const data = await res.json();
      let sorted = data.sort((a: any, b: any) => (b.評価 || 0) - (a.評価 || 0));

      sorted = sorted.map((row: any, idx: number) => {
        let address = String(row.住所 || "")
          .replace(/日本/g, "")
          .replace(/〒\s*[0-9０-９]{3}(?:[-‐-–—ー－ｰ]?[0-9０-９]{4})/g, "")
          .replace(/^[、,，\s]+/, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        const siteArr = Array.isArray(row.サイトリンク) ? row.サイトリンク : row.サイトリンク ? [row.サイトリンク] : [];
        const instaArrRaw = Array.isArray(row.インスタグラム) ? row.インスタグラム : row.インスタグラム ? [row.インスタグラム] : [];
        const instaArr = instaArrRaw.filter((u: string) => /instagram\.com/i.test(u));
        const mainInsta = instaArr.length > 0 ? [instaArr[0]] : [];

        const email = sanitizeEmail(row.メールアドレス);

        return {
          ...row,
          番号: idx + 1,
          住所: address,
          サイトリンク: siteArr,
          インスタグラム: mainInsta,
          メールアドレス: email,
        };
      });

      setResults(sorted);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (type: "excel" | "csv") => {
    if (results.length === 0) return;

    const headers = ["番号", "店舗名", "住所", "電話番号", "評価", "サイトリンク", "メールアドレス", "インスタグラム"];
    const rows = results.map((r) => [r.番号, r.店舗名, r.住所, r.電話番号, r.評価, (Array.isArray(r.サイトリンク) ? r.サイトリンク : []).join(" | "), r.メールアドレス || "", (Array.isArray(r.インスタグラム) ? r.インスタグラム : []).join(" | ")]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", type === "excel" ? "results.xlsx" : "results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">🔍 Google Places データ抽出</h1>

      <div className="flex gap-4 mb-6">
        <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="美容室、カフェ、パーソナルジムなど" className="px-4 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 w-1/3" />
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="◯◯市など" className="px-4 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 w-1/3" />
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Google Places APIキー" className="px-4 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 w-1/3" />
        <button onClick={handleSearch} className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg">
          🚀 検索実行
        </button>
      </div>

      {/* ローディングアニメーション */}
      {loading && <LoadingBar />}

      {results.length > 0 && (
        <>
          <table className="table-auto border-collapse border border-gray-700 w-full text-sm mb-4">
            <thead>
              <tr className="bg-gray-800">
                <th className="border border-gray-700 px-2 py-1">番号</th>
                <th className="border border-gray-700 px-2 py-1">店舗名</th>
                <th className="border border-gray-700 px-2 py-1">住所</th>
                <th className="border border-gray-700 px-2 py-1">電話番号</th>
                <th className="border border-gray-700 px-2 py-1">評価</th>
                <th className="border border-gray-700 px-2 py-1">サイトリンク</th>
                <th className="border border-gray-700 px-2 py-1">メールアドレス</th>
                <th className="border border-gray-700 px-2 py-1">インスタグラム</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-700 px-2 py-1">{row.番号}</td>
                  <td className="border border-gray-700 px-2 py-1">{row.店舗名}</td>
                  <td className="border border-gray-700 px-2 py-1">{row.住所}</td>
                  <td className="border border-gray-700 px-2 py-1">{row.電話番号}</td>
                  <td className="border border-gray-700 px-2 py-1">{row.評価}</td>
                  <td className="border border-gray-700 px-2 py-1">
                    {Array.isArray(row.サイトリンク) && row.サイトリンク.length > 0
                      ? row.サイトリンク.map((link: string, i: number) => (
                          <div key={i}>
                            <a href={link} target="_blank" className="text-blue-400 underline">
                              ホームページ{i + 1}
                            </a>
                          </div>
                        ))
                      : "なし"}
                  </td>
                  <td className="border border-gray-700 px-2 py-1">{row.メールアドレス || "なし"}</td>
                  <td className="border border-gray-700 px-2 py-1">
                    {Array.isArray(row.インスタグラム) && row.インスタグラム.length > 0
                      ? row.インスタグラム.map((link: string, i: number) => (
                          <div key={i}>
                            <a href={link} target="_blank" className="text-pink-400 underline">
                              Instagram
                            </a>
                          </div>
                        ))
                      : "なし"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-4">
            <button onClick={() => handleDownload("excel")} className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg">
              💾 エクセルダウンロード
            </button>
            <button onClick={() => handleDownload("csv")} className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg">
              📥 CSVダウンロード
            </button>
          </div>
        </>
      )}
    </main>
  );
}
