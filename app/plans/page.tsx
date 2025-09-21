// app/plans/page.tsx
export default function Plans() {
  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">プラン変更</h1>
      <p className="text-gray-300 mb-6">standard（月額1,000円）：1回60件／月5回まで</p>
      <button onClick={() => alert("ここでStripe決済へ。決済成功後、APIキーを standard に登録します。")} className="px-4 py-2 rounded bg-fuchsia-600 hover:bg-fuchsia-700">
        お支払いへ進む
      </button>
    </main>
  );
}
