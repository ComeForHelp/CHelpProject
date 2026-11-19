import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Сборка для Docker: в образ попадает только нужное для запуска.
  output: 'standalone',
  // Вторая сборка рядом с запущенной (проверка, не трогая работающий стенд): NEXT_DIST_DIR=.next-check
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Mantine и иконки большие — подключаем только используемые части.
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@tabler/icons-react'],
    // На машинах с малым запасом памяти: NEXT_BUILD_CPUS=1 npm run build
    ...(process.env.NEXT_BUILD_CPUS ? { cpus: Number(process.env.NEXT_BUILD_CPUS), workerThreads: false } : {}),
    // Фото чеков до 10 МБ проходят через пересылку /api ниже
    middlewareClientMaxBodySize: '12mb',
  },
  /**
   * Пересылка /api/* на backend: сайт и API на одном адресе.
   * Нужна, когда наружу открыт только frontend (туннель с ноутбука, NEXT_PUBLIC_API_URL=/api/v1).
   * На сервере /api/* перехватывает Caddy раньше, сюда запросы не доходят.
   */
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3001';
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
