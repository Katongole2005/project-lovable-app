/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.100.73'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true, // focus on UI functionality first during migration
  },
  async rewrites() {
    // Allows configuring the backend URL for Cloudflare/Vercel via environment variable
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
