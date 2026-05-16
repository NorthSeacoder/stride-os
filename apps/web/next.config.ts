import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import type { NextConfig } from 'next';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  version?: string;
};

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION
      ?? process.env.APP_VERSION
      ?? process.env.GIT_TAG
      ?? packageJson.version
      ?? 'dev',
    NEXT_PUBLIC_GIT_SHA: process.env.NEXT_PUBLIC_GIT_SHA
      ?? process.env.GIT_SHA
      ?? process.env.VERCEL_GIT_COMMIT_SHA
      ?? '',
  },
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  transpilePackages: ['@stride-os/ui', '@stride-os/db', '@stride-os/api-contract'],
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
