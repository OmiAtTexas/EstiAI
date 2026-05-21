/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["xlsx", "@prisma/client", "prisma"],
}
module.exports = nextConfig