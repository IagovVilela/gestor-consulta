/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3011', pathname: '/api/uploads/**' },
      { protocol: 'https', hostname: '**.up.railway.app', pathname: '/api/uploads/**' },
      { protocol: 'https', hostname: '**.railway.app', pathname: '/api/uploads/**' },
    ],
  },
  async rewrites() {
    const apiOrigin = process.env.BACKEND_URL || 'http://localhost:3011'
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ]
  },
  // Otimizações para hot reload
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
}

module.exports = nextConfig
