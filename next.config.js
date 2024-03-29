/** @type {import('next').NextConfig} */
// const nextSafe = require("next-safe");

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  skipWaiting: true,
});

module.exports = withPWA({
  reactStrictMode: true,
  webpack(config, options) {
    config.resolve.extensions.push(".ts", ".tsx");
    return config;
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.*.*",
      },
      {
        protocol: "https",
        hostname: "**.**.*.*",
      },
      {
        protocol: "https",
        hostname: "simkl.in",
      },
      {
        protocol: "https",
        hostname: "tenor.com",
      },
      {
        protocol: "https",
        hostname: "meionovel.id",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/changelogs",
        destination: "https://github.com/streamsora/streamsora/releases",
        permanent: false,
        basePath: false,
      },
      {
        source: "/github",
        destination: "https://github.com/streamsora/streamsora",
        permanent: false,
        basePath: false,
      },
      {
        source: "/discord",
        destination: "https://discord.gg/v5fjSdKwr2",
        permanent: false,
        basePath: false,
      },
    ];
  },
});
