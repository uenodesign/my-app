// app/plans/page.tsx  ← サーバーコンポーネント
import PlansView from "../_components/PlansView";

export default async function PlansPage() {
  const plans = [
    { id: "free", name: "無料", credits: 2, price: 0 },
    {
      id: "std",
      name: "有料",
      credits: 5,
      price: 1000,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID, // .env から
    },
  ];
  return <PlansView plans={plans} />;
}
