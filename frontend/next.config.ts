import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Сборка для Docker: в образ попадает только нужное для запуска.
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Mantine и иконки большие — подключаем только используемые части.
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@tabler/icons-react'],
    // На машинах с малым запасом памяти: NEXT_BUILD_CPUS=1 npm run build
    ...(process.env.NEXT_BUILD_CPUS ? { cpus: Number(process.env.NEXT_BUILD_CPUS), workerThreads: false } : {}),
  },
};

export default nextConfig;
