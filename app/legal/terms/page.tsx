// app/legal/terms/page.tsx
export const metadata = { title: "利用規約" };

export default function Terms() {
  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          <a href="https://search.uenodesign.site/">検索ツールPro</a>
        </h1>
      </header>
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold">利用規約</h2>
        <p className="text-[#1D1D1F] text-sm">本規約は、UENO DESIGN（以下「当社」）が提供する本サービスの利用条件を定めるものです。 ご利用にあたり本規約に同意いただいたものとみなします。</p>

        <section>
          <h2 className="text-lg font-semibold mb-2">1. 定義</h2>
          <p className="text-[#1D1D1F] text-sm">「本サービス」とは、Google Places 情報の検索・抽出機能および関連機能を指します。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. 利用環境・APIキー</h2>
          <ul className="list-disc list-inside text-[#1D1D1F] text-sm space-y-1">
            <li>本サービスはユーザー自身が保有する Google API キーで動作します。</li>
            <li>API キーの管理・課金はユーザーの責任にて行うものとします。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. 禁止事項</h2>
          <ul className="list-disc list-inside text-[#1D1D1F] text-sm space-y-1">
            <li>法令・公序良俗に反する行為</li>
            <li>第三者の権利侵害、スパム等の迷惑行為</li>
            <li>本サービスの逆コンパイル・不正アクセス</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. 免責</h2>
          <p className="text-[#1D1D1F] text-sm">当社は、本サービスの正確性・完全性・有用性を保証しません。利用により生じたいかなる損害についても、当社は責任を負いません。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. 利用制限・停止</h2>
          <p className="text-[#1D1D1F] text-sm">当社は、必要と判断した場合、事前の通知なく本サービスの全部または一部の提供を停止・中断・終了できるものとします。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. 規約の変更</h2>
          <p className="text-[#1D1D1F] text-sm">当社は、必要に応じて本規約を変更することができます。変更後の規約は、当社所定の方法で周知した時点から効力を生じます。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. 準拠法・裁判管轄</h2>
          <p className="text-[#1D1D1F] text-sm">本規約は日本法に準拠します。本サービスに関して紛争が生じた場合、当社の所在地を第一審の専属的合意管轄裁判所とします。</p>
        </section>

        <footer className="text-gray-400 text-xs">最終更新日：{new Date().toLocaleDateString("ja-JP")}</footer>
      </div>

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
