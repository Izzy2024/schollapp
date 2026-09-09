import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Avoid Next mistakenly inferring the monorepo root from unrelated lockfiles.
  // This prevents build/prerender invariants caused by an incorrect workspace root.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          // NOTE: no Content-Security-Policy on purpose. The app relies on
          // Stripe Checkout (external redirect), Google Classroom OAuth, and
          // unaudited third-party image/script origins — an untested CSP would
          // silently break those flows.
        ],
      },
    ];
  },
};

export default nextConfig;
