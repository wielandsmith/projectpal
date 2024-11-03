/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' https://*.supabase.co",
              "object-src 'none'",
              "frame-ancestors 'self'",
              "img-src 'self' data: blob: https://*.supabase.co",
              "media-src 'self' https://*.supabase.co",
              "worker-src 'self' blob:",
              "form-action 'self'",
              "base-uri 'self'"
            ].join('; ')
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;