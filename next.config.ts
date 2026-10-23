import type { NextConfig } from "next";

// Khi mở app dev từ điện thoại qua mạng LAN, Next chặn tài nguyên dev từ origin lạ.
// Khai báo địa chỉ LAN trong ALLOWED_DEV_ORIGINS (ví dụ: 192.168.1.*) rồi chạy `npm run dev:lan`.
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins,
  poweredByHeader: false,
  // Lớp dữ liệu nhập sẵn được đọc bằng đường dẫn động lúc chạy (xem src/lib/store/index.ts) → phải khai báo để Vercel đóng gói kèm các hàm server.
  outputFileTracingIncludes: {
    "/**": ["./content/imported/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
