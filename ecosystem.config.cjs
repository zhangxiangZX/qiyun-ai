// pm2 进程守护配置（备选方案，需本机先装 pm2: npm i -g pm2）
// 用法：
//   pm2 start ecosystem.config.cjs
//   pm2 logs qiyun-console-dev
//   pm2 stop qiyun-console-dev
// 好处：崩溃自动重启 + 开机自启（pm2 save + pm2 startup）+ 日志持久化
module.exports = {
  apps: [
    {
      name: "qiyun-console-dev",
      cwd: "./apps/console",
      script: "node_modules/next/dist/bin/next",
      args: "dev -p 3000",
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 2000,
      watch: false,
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
