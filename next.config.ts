import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Thư viện IMAP / đọc email dùng API Node.js, không cần đóng gói lại
  serverExternalPackages: ["imapflow", "mailparser"],
};

export default nextConfig;
