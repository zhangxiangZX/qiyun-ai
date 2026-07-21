/** @type {import('next').NextConfig} */
module.exports = {
  // Development and production must never share build artifacts. A dev server
  // mutates its directory continuously and can otherwise corrupt a live build.
  distDir: process.env.NODE_ENV === 'production' ? '.next-prod' : '.next',

  transpilePackages: ['@qiyun/ui'],

  // 不暴露 X-Powered-By 头（安全/最佳实践）
  poweredByHeader: false,

  // 图片优化：启用 AVIF/WebP，并为已知远程图域名加白名单
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'ai.kuzimash.com' },
      { protocol: 'https', hostname: 'cdn.qiyun.ai' },
      { protocol: 'https', hostname: 'select.qiyun.ai' },
      { protocol: 'https', hostname: 'widget.qiyun.ai' },
      { protocol: 'https', hostname: 'www.qiyunai.com' },
    ],
  },

  // 按需引入 barrel 包：lucide-react 默认会从入口拉全量图标，
  // 开启后可把 `import { X } from 'lucide-react'` 改写成直达子模块，
  // 显著减小首屏 JS（dev/prod 双收益，零代码改动）。
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // 生产构建中剔除 console.*（保留 error/warn），减小包体并清理控制台
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] },
  },

  // Webpack 分包优化：仅生产构建启用。
  // Dev 下覆盖 splitChunks 会打乱 App Router HMR 模块 ID，
  // 表现为 TypeError: Cannot read properties of undefined (reading 'call')。
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'framework',
            priority: 40,
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'vendor-radix',
            priority: 30,
          },
          lucide: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'vendor-icons',
            priority: 30,
          },
          ui: {
            test: (module) =>
              typeof module.resource === 'string' &&
              module.resource.includes('packages/ui/src/components'),
            name: 'vendor-ui',
            priority: 20,
          },
          commons: {
            name: 'commons',
            minChunks: 3,
            priority: 10,
          },
        },
      };
    }
    return config;
  },
};
