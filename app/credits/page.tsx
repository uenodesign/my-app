// app/credits/page.tsx
"use client";

import { useEffect, useState } from "react";

type CheckoutResponse = { url?: string; message?: string };

export default function CreditsPage() {
  const [apiKey, setApiKey] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setApiKey(localStorage.getItem("search_pro_apiKey") || "");
    setEmail(localStorage.getItem("search_pro_email") || "");
  }, []);

  const isEmailValid = (v: string) => /\S+@\S+\.\S+/.test(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const key = apiKey.trim();
    const mail = email.trim();

    if (!key) return setError("APIキーを入力してください。");
    if (!isEmailValid(mail)) return setError("メールアドレスを正しく入力してください。");

    setSubmitting(true);
    try {
      localStorage.setItem("search_pro_apiKey", key);
      localStorage.setItem("search_pro_email", mail);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key, email: mail }),
      });

      const json = (await res.json().catch(() => ({}))) as CheckoutResponse;

      if (!res.ok || !json.url) {
        setError(json.message || "セッション作成に失敗しました。しばらくしてからお試しください。");
        setSubmitting(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("ネットワークエラーが発生しました。");
      setSubmitting(false);
    }
  };

  const disabled =
    submitting || !apiKey.trim() || !email.trim() || !isEmailValid(email.trim());

  return (
    <main className="min-h-[70vh] bg-white">
      <div className="mx-auto max-w-xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-black">クレジットを追加</h1>
     

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900">APIキー</label>
            <input
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-black"
              type="text"
              placeholder="AIza... など"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-gray-500">
              このAPIキーにクレジットが付与されます（検索はこのキーで行われます）。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">メールアドレス</label>
            <input
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-black"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={disabled}
            className={`w-full rounded-xl px-4 py-3 text-white transition ${
              disabled ? "bg-gray-300 cursor-not-allowed" : "bg-black hover:opacity-90"
            }`}
          >
            {submitting ? "お待ちください…" : "支払いへ進む（初回は無料）"}
          </button>

          <div className="mt-6 rounded-xl border border-gray-200 p-4 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-900">内訳</h2>
            <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
              <li>初回：無料（自動でクーポン適用 / カード不要）</li>
              <li>2回目以降：100円で +10回 付与</li>
            </ul>
          </div>
        </form>
      <br />
           <a className="px-4 py-2 rounded bg-[#E1E1E7] text-[#1D1D1F] cursor-pointer" href="https://search.uenodesign.site/">
        検索ページへ戻る
      </a>
      </div>
    </main>
  );
}
