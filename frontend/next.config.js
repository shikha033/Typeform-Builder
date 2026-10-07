/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy the API so the browser only talks to the Next.js origin
    return [{ source: "/api/:path*", destination: `${BACKEND}/api/:path*` }];
  },
};

module.exports = nextConfig;
