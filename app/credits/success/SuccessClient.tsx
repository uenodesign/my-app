// app/credits/success/SuccessClient.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SuccessClient() {
  const sp = useSearchParams();
  const k = sp.get("k");

  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-6">
      <h1 className="text-2xl font-bold mb-4">決済が完了しました</h1>
      <p className="mb-6">
        クレジットが間もなく付与されます。APIキー：
        {k ? <code>{k}</code> : "-"}
      </p>
      <Link href="/" className="underline text-blue-300">
        検索画面へ戻る
      </Link>
    </main>
  );
}
