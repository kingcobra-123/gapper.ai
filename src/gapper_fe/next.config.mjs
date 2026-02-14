/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        // Ignore timed-out OrbStack mount lookups during initial file scan.
        ignored: "/Users/satish/OrbStack/**"
      };
    }

    return config;
  }
};

export default nextConfig;
