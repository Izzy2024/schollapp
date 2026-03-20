import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Avoid Next mistakenly inferring the monorepo root from unrelated lockfiles.
  // This prevents build/prerender invariants caused by an incorrect workspace root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
