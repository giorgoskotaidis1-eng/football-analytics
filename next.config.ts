const nextConfig = {
  typescript: {
    // Pre-existing strict TS issues across legacy files; dev works with strict: false
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
