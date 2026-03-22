/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/ws/:path*',
        destination: 'http://localhost:8080/ws/:path*',
      },
    ];
  },
};

export default nextConfig;