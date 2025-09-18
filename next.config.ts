// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ビルド時に ESLint エラーを無視
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 型エラーでもビルドを止めない
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
