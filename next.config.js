/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['picsum.photos', 'images.unsplash.com'],
  },
  transpilePackages: ['lucide-react'],
}

module.exports = nextConfig

