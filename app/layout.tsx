// app/layout.tsx
import "./globals.css";
import TokenBootstrap from "./_components/TokenBootstrap"; // ← ここに追記

export const metadata = { title: "検索ツールPro" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <TokenBootstrap /> {/* ← <body> の先頭あたりで一度だけレンダ */}
        {children}
      </body>
    </html>
  );
}
