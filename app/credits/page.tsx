// app/credits/page.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type CheckoutResponse = { url?: string; message?: string };

/** パンくずリスト（URL階層から自動生成） */
function Breadcrumbs({ className = "mt-2 mb-6" }: { className?: string }) {
  const pathname = usePathname();
  const segments = (pathname || "/").split("/").filter(Boolean);

  const labelMap: Record<string, string> = {
    credits: "クレジット追加",
  };

  const crumbs = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const isLast = idx === segments.length - 1;
    const label = labelMap[seg] ?? decodeURIComponent(seg);
    return (
      <li key={href} className="flex items-center">
        <svg aria-hidden className="mx-2 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        {isLast ? (
          <span className="text-sm text-gray-500" aria-current="page">{label}</span>
        ) : (
          <Link href={href} className="text-sm text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline">
            {label}
          </Link>
        )}
      </li>
    );
  });

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center">
        <li className="flex items-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline">
            ホーム
          </Link>
        </li>
        {crumbs}
      </ol>
    </nav>
  );
}


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


        <h1 className="mb-5 text-3xl font-semibold tracking-tight text-black">
          検索クレジットを追加
        </h1>
        {/* ←ここがパンくず */}
   <Breadcrumbs className="mt-2 mb-12" />
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900">APIキー</label>
            <input
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-black"
              type="text"
              placeholder="AIza... "
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
            {submitting ? "お待ちください…" : "支払いへ進む（初回無料）"}
          </button>

          <div className="mt-6 mb-15 rounded-xl border border-gray-200 p-4 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-900">内訳</h2>
            <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
              <li>初回：無料（自動でクーポン適用 / カード不要）</li>
              <li>2回目以降：300円で +10回 付与</li>
            </ul>
          </div>
        </form>

        <a
          className="px-4 py-2 rounded bg-[#E1E1E7] text-[#1D1D1F] cursor-pointer"
          href="https://search.uenodesign.site/"
        >
          ホームへ戻る
        </a>
      </div>
    </main>
  );
}
