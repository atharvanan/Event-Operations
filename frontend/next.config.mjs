/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    const backendHost =
      process.env.BACKEND_INTERNAL_URL ||
      (process.env.NODE_ENV === 'production' ? 'http://backend:5000' : 'http://localhost:5000');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendHost}/api/v1/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${backendHost}/socket.io/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendHost}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
