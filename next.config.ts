import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  images: {
    domains: ['lh3.googleusercontent.com', 'firebasestorage.googleapis.com', 'image.pollinations.ai'],
  },
};

export default nextConfig;
