import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'whimsical-goldfish-942.convex.cloud',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
