/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mark pdfkit and related packages as server-only (not bundled for client)
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'pdf-parse', 'mammoth'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle these packages on the server
      config.externals = config.externals || [];
      config.externals.push({
        'pdfkit': 'commonjs pdfkit',
        'pdf-parse': 'commonjs pdf-parse',
        'mammoth': 'commonjs mammoth',
      });
    }
    return config;
  },
};

export default nextConfig;

