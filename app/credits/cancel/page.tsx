export default function Cancel() {
  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-2">キャンセルされました</h1>
      <p className="text-gray-300 mb-6">購入は行われていません。</p>
      <a className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600" href="/credits">
        もう一度やり直す
      </a>
    </main>
  );
}
