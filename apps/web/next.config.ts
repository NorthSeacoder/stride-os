import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@stride-os/ui', '@stride-os/db', '@stride-os/api-contract'],
  turbopack: {
    root: '../..',
  },
};

export default nextConfig;
