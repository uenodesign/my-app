// app/legal/tokushoho/page.tsx
export default function Tokushoho() {
  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-6">特定商取引法に基づく表記</h1>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="min-w-full text-sm">
          <tbody>
            {[
              ["販売業者", "UENO DESIGN"],
              ["運営統括責任者", "上野 彰史"],
              ["所在地", "請求をいただければ遅滞なく開示します。"],
              ["電話番号", "請求をいただければ遅滞なく開示します。"],
              ["メールアドレス", "ueno@uenodesign.site"],
              ["販売URL", "https://search.uenodesign.site/"],
              ["販売価格", "クレジット5回 500円"],
              ["商品代金以外の必要料金", "決済手数料は原則無し。通信料はお客様負担"],
              ["お支払い方法", "クレジットカード（Stripe）"],
              ["役務の提供時期", "決済完了後、即時にクレジット付与"],
              ["返品・キャンセル", "性質上、役務提供後の返金は不可（誤課金はお問い合わせください）"],
              ["表現および商品に関する注意書き", "効果・結果には個人差があり、必ずしも利益を保証するものではありません"],
            ].map(([label, value]) => (
              <tr key={label} className="odd:bg-neutral-900/40">
                <th className="w-48 px-4 py-3 text-left font-semibold text-gray-300 border-b border-neutral-800 align-top">{label}</th>
                <td className="px-4 py-3 border-b border-neutral-800">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
