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
  const [rows, setRows] = useState<ResultRow[]>([]);
  // ...他のstate省略

  useEffect(() => {
    // 必要ならここで API 呼び出し
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      {/* 省略：既存のUI */}
      {rows.length === 0 ? <p className="text-gray-400">結果なし</p> : null}
    </main>
  );
}
