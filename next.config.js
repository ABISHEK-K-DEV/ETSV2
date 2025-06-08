/** @type {import('next').NextConfig} */
const nextConfig = {
  // The 'target' property is deprecated and should be removed
  // Remove the experimental.appDir as it's causing a warning 
  // (may need to use other settings based on Next.js version)
  
  // Add CORS headers for API endpoints
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  // Configure output option for Netlify to handle serverless functions
  output: 'standalone',
}

module.exports = nextConfig
