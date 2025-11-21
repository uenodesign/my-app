// app/credits/success/page.tsx
export default function Success() {
  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold ">
          <a href="https://search.uenodesign.site/">Search Pro</a>
        </h1>
      </header>
      <h2 className="text-2xl font-bold mb-2">購入が完了しました</h2>
      <p className="mb-6">クレジットが付与されました。検索1回につき1クレジットを消費します。</p>
      <a className="px-4 py-2 rounded bg-[#E1E1E7] text-[#1D1D1F] cursor-pointer" href="https://search.uenodesign.site/">
        検索ページへ戻る
      </a>
      {/* ▼ フッター（特商法・利用規約・プライバシー） */}
      <footer className="mt-12 border-t border-neutral-300 pt-6 text-sm text-neutral-600">
        <div className="flex justify-center flex-wrap gap-4">
          <a className="underline hover:text-[#1D1D1F]" href="/legal/tokushoho">
            特定商取引法に基づく表記
          </a>
          <a className="underline hover:text-[#1D1D1F]" href="/legal/terms">
            利用規約
          </a>
          <a className="underline hover:text-[#1D1D1F]" href="/legal/privacy">
            プライバシーポリシー
          </a>
        </div>
      </footer>
    </main>
  );
}
