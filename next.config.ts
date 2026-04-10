import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // pdfjs-dist が canvas (Node.js ネイティブモジュール) を optional require するが、
    // ブラウザでは不要なため false に alias して webpack エラーを回避。
    // react-pdf + Next.js の公式推奨設定。
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
