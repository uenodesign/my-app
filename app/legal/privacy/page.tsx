// app/legal/privacy/page.tsx
export const metadata = { title: "プライバシーポリシー" };

export default function Privacy() {
  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold ">
          <a href="https://search.uenodesign.site/">検索ツールPro</a>
        </h1>
      </header>
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold">プライバシーポリシー</h2>
        <p className="text-[#1D1D1F] text-sm">{`{事業者名}`}（以下「当社」）は、本サービスの提供に際し取得する情報の取扱いについて、以下のとおり定めます。</p>

        <section>
          <h2 className="text-lg font-semibold mb-2">1. 取得する情報</h2>
          <ul className="list-disc list-inside text-[#1D1D1F] text-sm space-y-1">
            <li>ユーザーが入力する検索キーワード・地域・Google API キー（※サーバー側にはハッシュ化 ID のみ保存）</li>
            <li>利用回数・利用日時等のメタデータ</li>
            <li>決済に関する情報（Stripe を利用し、カード情報は当社サーバーで保持しません）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. 利用目的</h2>
          <ul className="list-disc list-inside text-[#1D1D1F] text-sm space-y-1">
            <li>本サービスの提供・品質向上・不正利用防止</li>
            <li>利用回数の管理、決済に基づくクレジット付与</li>
            <li>法令遵守・ユーザーからの問い合わせ対応</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. 第三者提供</h2>
          <p className="text-[#1D1D1F] text-sm">法令に基づく場合等を除き、本人の同意なく第三者へ提供しません。決済処理は Stripe に委託し、カード情報は Stripe により安全に処理されます。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. 安全管理措置</h2>
          <p className="text-[#1D1D1F] text-sm">サーバー・アプリケーションのアクセス制御、通信の暗号化、ログ監査等、適切な安全管理措置を講じます。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. 開示・訂正・削除</h2>
          <p className="text-[#1D1D1F] text-sm">ご本人からの保有個人データに関する開示・訂正・削除の請求に、法令に基づき適切に対応します。問い合わせは下記窓口までご連絡ください。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. 改定</h2>
          <p className="text-[#1D1D1F] text-sm">本ポリシーは予告なく改定する場合があります。改定後は当ページに掲示します。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. 連絡先</h2>
          <p className="text-[#1D1D1F] text-sm">ueno（＠）uenodesign.site　(@)を@に変更ください。</p>
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
