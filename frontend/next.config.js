// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   async rewrites() {
//     return [
//       { source: '/media/:path*', destination: 'http://127.0.0.1:8000/media/:path*' },
//     ];
//   },
// };
// module.exports = nextConfig;


/** @type {import('next').NextConfig} */

// ここでバックエンドの起点URLを決めます（.env.local で上書き可）
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:8000';

const nextConfig = {
  // 必要なら他のNext設定もここに追記
  async rewrites() {
    return [
      // Nextの /api/* を FastAPI の /* へ中継
      { source: '/api/:path*', destination: `${BACKEND_ORIGIN}/:path*` },

      // Nextの /media/* を FastAPI の /media/* へ中継（mp3など静的ファイル）
      { source: '/media/:path*', destination: `${BACKEND_ORIGIN}/media/:path*` },
    ];
  },
};

module.exports = nextConfig;