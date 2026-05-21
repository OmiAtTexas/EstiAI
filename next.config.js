/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["xlsx", "@prisma/client", "prisma"],
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
}
module.exports = nextConfig