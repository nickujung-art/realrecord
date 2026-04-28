import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "realrecord-*.vercel.app"], // 배포될 Vercel 도메인 패턴도 허용에 추가하는 것이 좋습니다.
    },
  },
  // 다른 설정들이 있다면 그대로 유지하세요.
};

export default nextConfig;