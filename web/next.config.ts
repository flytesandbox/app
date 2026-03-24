import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  distDir: 'next-phase7',
  experimental: {
    webpackBuildWorker: false,
  },
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
