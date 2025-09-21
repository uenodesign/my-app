// app/layout.tsx
import "./globals.css"; // あれば

export const metadata = { title: "App" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
