"use client";
import { useState } from "react";

export default function CreditsBuy() {
  const [apiKey, setApiKey] = useState("");

  const goCheckout = async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "エラー");
      return;
    }
    window.location.href = data.url; // Stripe Checkout へ遷移
  };

  return (
    <main className="p-6 text-white bg-black min-h-screen">
      <h1 className="text-xl font-bold mb-4">クレジット購入（5回 / 1,000円）</h1>
      <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="あなたの Google Places API キー" className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700" />
      <button onClick={goCheckout} className="ml-3 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700">
        支払いへ進む
      </button>
    </main>
  );
}
