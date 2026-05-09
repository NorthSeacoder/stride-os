import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  transpilePackages: ['@stride-os/ui', '@stride-os/db', '@stride-os/api-contract'],
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
