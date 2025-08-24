/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/media/:path*', destination: 'http://127.0.0.1:8000/media/:path*' },
    ];
  },
};
module.exports = nextConfig;
