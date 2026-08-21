

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  images: {
    domains: ['lh3.googleusercontent.com', 'firebasestorage.googleapis.com', 'image.pollinations.ai'],
  },
};

export default nextConfig;
