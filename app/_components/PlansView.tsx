// components/PlansView.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  id: string;
  name: string;
  credits: number;
  price: number; // 円
  priceId?: string; // StripeのPrice ID（将来の拡張用。現状はサーバ固定PRICE_IDを使用）
};

export default function PlansView({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // ★ 追加：購入に使う Google Places API キー
  const [apiKey, setApiKey] = useState("");

  const handleBuy = async (plan: Plan) => {
    if (plan.price <= 0) {
      router.push("/search");
      return;
    }
    if (!apiKey.trim()) {
      alert("購入前に Google Places API キーを入力してください。");
      return;
    }

    setLoadingId(plan.id);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ★ サーバは apiKey を必須として検証・ハッシュ保存します
        body: JSON.stringify({ apiKey }), // priceIdはサーバ側で環境変数固定のため送らない/無視される
        credentials: "include", // 念のためCookie送出（app_token）
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "checkout failed");
      }

      const { url } = await res.json();
      if (typeof url === "string" && url) {
        router.push(url); // Stripe Checkoutへ
      } else {
        throw new Error("Checkout URLを取得できませんでした。");
      }
    } catch (e: unknown) {
      console.error(e);
      alert(e instanceof Error ? e.message : "購入フローを開始できませんでした。時間をおいて再実行してください。");
      setLoadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ★ 追加：APIキー入力欄（購入前に必須） */}
      <div className="rounded-2xl border p-4">
        <label className="block text-sm font-medium">Google Places API キー</label>
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza... で始まるAPIキーを入力" className="mt-2 w-full rounded-xl border px-3 py-2" />
        <p className="mt-2 text-xs text-neutral-600">※ 購入時にキーのハッシュを保存し、このキーにクレジットをひも付けます。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((p) => (
          <div key={p.id} className="rounded-2xl border p-6 shadow-sm">
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <p className="mt-1 text-sm opacity-80">{p.credits} クレジット</p>
            <p className="mt-2 text-2xl font-bold">{p.price.toLocaleString()} 円</p>

            {p.price > 0 ? (
              <button onClick={() => handleBuy(p)} disabled={loadingId === p.id} className="mt-4 inline-flex items-center justify-center rounded-xl border px-4 py-2 disabled:opacity-60">
                {loadingId === p.id ? "処理中…" : "購入する"}
              </button>
            ) : (
              <a href="/search" className="mt-4 inline-block rounded-xl border px-4 py-2 text-center">
                無料で試す
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
