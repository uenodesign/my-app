// app/legal/tokushoho/page.tsx
export default function Tokushoho() {
  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          <a href="https://search.uenodesign.site/">検索ツールPro</a>
        </h1>
      </header>
      <h2 className="text-2xl font-bold mb-6">特定商取引法に基づく表記</h2>

      <div className="overflow-x-auto rounded-xl border border-neutral-300">
        <table className="min-w-full text-sm">
          <tbody>
            {[
              ["販売業社の名称", "上野 彰史"],
              ["所在地", "請求があったら遅滞なく開示します"],
              ["電話番号", "請求があったら遅滞なく開示します"],
              ["メールアドレス", "ueno（＠）uenodesign.site　(@)を@に変更ください。"],
              ["運営統括責任者", "上野 彰史"],
              ["追加手数料等の追加料金", "インターネット接続に伴う通信費はお客様のご負担となります。その他の手数料が発生する場合は、該当ページに明記します。"],
              ["交換および返品（返金ポリシー）", "デジタル商品の性質上、お客様都合での返金・キャンセルはお受けしておりません。不具合や二重決済など当社の瑕疵がある場合は、調査のうえ返金またはクレジット付与で対応します（お問い合わせ：ueno@uenodesign.site）"],
              ["引渡時期", "決済完了後、即時にクレジットが付与されます。"],
              ["受け付け可能な決済手段", "クレジットカード（Stripe）"],
              ["決済期間", "クレジットカード決済は即時に処理されます。"],
              ["販売価格", "商品ページに表示（検索クレジット（5回）：税込100円）"],
            ].map(([label, value]) => (
              <tr key={label} className="odd:bg-white">
                <th className="w-56 px-4 py-3 text-left font-semibold text-[#1D1D1F] border-b border-neutral-300 align-top">{label}</th>
                <td className="px-4 py-3 border-b border-neutral-300">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
