"use client";
import { useEffect, useState } from "react";

export default function Success() {
  const [k, setK] = useState("");

  useEffect(() => {
    const u = new URL(window.location.href);
    setK(u.searchParams.get("k") ?? "");
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-2">決済が完了しました ✅</h1>
      <p className="text-gray-300 mb-6">クレジットが付与されました（+5）。</p>
      <div className="flex gap-3">
        <a className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700" href={k ? `/?apiKey=${encodeURIComponent(k)}` : "/"}>
          検索画面へ戻る
        </a>
        <a className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600" href="/">
          TOPへ
        </a>
      </div>
    </main>
  );
}
