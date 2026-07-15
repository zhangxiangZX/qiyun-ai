# 阿里云 ECS 部署指南（Qiyun AI）

适用实例：**4核 8GiB · Ubuntu 22.04**（公网 IP 示例：`101.201.63.118`）

目标：在 ECS 上跑 `postgres + redis + minio + qdrant + api + worker`，Nginx 反代 API；本地 Console 通过 `API_BASE_URL` 联调。

---

## 1. 安全组（阿里云控制台）

| 端口 | 协议 | 授权对象 | 用途 |
|------|------|----------|------|
| 22 | TCP | 你的办公 IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP API |
| 443 | TCP | 0.0.0.0/0 | HTTPS（可选） |

**不要**对公网开放：5432、6379、9000、6333、3001。

---

## 2. SSH 登录与基础软件

```bash
ssh root@101.201.63.118

apt update && apt upgrade -y
apt install -y git curl nginx

# Docker
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
```

---

## 3. 拉代码与环境变量

```bash
mkdir -p /opt/qiyun-ai && cd /opt/qiyun-ai

# 换成你的仓库地址
git clone https://github.com/zhangxiangZX/qiyun-ai.git .

cp infra/.env.ecs.example .env
nano .env
```

**必须修改的项：**

```bash
# 生成 JWT 密钥
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 32   # → JWT_REFRESH_SECRET

# 数据库密码（POSTGRES_PASSWORD 与 DATABASE_URL 中密码一致）
POSTGRES_PASSWORD=你的强密码
DATABASE_URL=postgresql://postgres:你的强密码@postgres:5432/qiyun_ai

# LLM：DeepSeek 示例
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-你的DeepSeek密钥
LLM_CHAT_MODEL=deepseek-chat
LLM_EMBEDDING_ENABLED=false

# 本地 Console 开发机 IP 或域名
CORS_ORIGIN=http://你的本机IP:3000
APP_URL=http://101.201.63.118
```

---

## 4. 一键部署

```bash
chmod +x infra/ecs/deploy.sh
./infra/ecs/deploy.sh
```

或分步：

```bash
docker compose -f infra/docker-compose.ecs.yml --profile ops run --rm migrate
docker compose -f infra/docker-compose.ecs.yml up -d --build
```

验证：

```bash
curl http://127.0.0.1:3001/health
# {"status":"ok","driver":"postgres",...}
```

数据库备份：

```bash
chmod +x infra/ecs/backup.sh
./infra/ecs/backup.sh
# 输出到 backups/qiyun-db-<时间>.sql.gz
```

---

## 5. Nginx 反代（公网 80 端口）

```bash
cd /opt/qiyun-ai

# 如有域名，把 server_name 改成 api.example.com
sudo cp infra/nginx/qiyun-api.conf /etc/nginx/sites-available/qiyun-api
sudo ln -sf /etc/nginx/sites-available/qiyun-api /etc/nginx/sites-enabled/qiyun-api
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

curl http://101.201.63.118/
```

---

## 6. 本地 Console 联调

### Windows（E 盘开发机）

仓库路径示例：`E:\qiyun-ai`

```powershell
cd E:\qiyun-ai
pnpm install

# 同时打开 API + Console 两个窗口
powershell -ExecutionPolicy Bypass -File infra/windows/dev-all.ps1
```

`apps/console/.env.local`（已模板化，可按环境改）：

```env
API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_WIDGET_URL=http://localhost:3001
```

联调 ECS 时把 `API_BASE_URL` 改为公网 IP：

```env
API_BASE_URL=http://101.201.63.118
NEXT_PUBLIC_WIDGET_URL=http://101.201.63.118
```

pnpm 缓存与依赖均在 **E 盘**（见根目录 `.npmrc` 的 `store-dir=E:/pnpm-store`）。

### Linux / macOS

在开发机 `apps/console/.env.local`：

```env
API_BASE_URL=http://101.201.63.118
```

```bash
pnpm --filter qiyun-console dev
```

浏览器打开 `http://localhost:3000` → 注册登录 → 顶栏应显示「真实 API」。

**验收清单：**

- [ ] 注册 / 登录
- [ ] 知识库上传文档
- [ ] 机器人编辑保存（含 welcomeMessage）
- [ ] 站点域名 PATCH 保存后重启 API 仍在
- [ ] 会话列表 / 线索 PATCH

---

## 7. 域名绑定（qiyuntu.cn · 五域名正式方案）

完整步骤见 **[docs/38-production-domains.md](../../docs/38-production-domains.md)**；操作清单见 **[docs/34-qiyuntu-domain-setup.md](../../docs/34-qiyuntu-domain-setup.md)**。

| 域名 | 用途 |
|------|------|
| `www.qiyuntu.cn` | 官网 |
| `console.qiyuntu.cn` | 后台 |
| `api.qiyuntu.cn` | API |
| `go.qiyuntu.cn` | 客户入口 |
| `cdn.qiyuntu.cn` | Widget CDN |

HTTPS：

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx \
  -d www.qiyuntu.cn -d console.qiyuntu.cn -d api.qiyuntu.cn \
  -d go.qiyuntu.cn -d cdn.qiyuntu.cn
```

`.env` 同步见 `infra/.env.ecs.example`：`APP_URL` / `PUBLIC_*` / `NEXT_PUBLIC_WIDGET_URL` / `CORS_ORIGIN` 均为 HTTPS；`COOKIE_SECURE=true`。

---

## 8. 运维命令

```bash
cd /opt/qiyun-ai

# 查看日志
docker compose -f infra/docker-compose.ecs.yml logs -f api
docker compose -f infra/docker-compose.ecs.yml logs -f worker

# 重启
docker compose -f infra/docker-compose.ecs.yml restart api worker

# 更新代码后重新部署
git pull
./infra/ecs/deploy.sh

# 数据卷（备份 Postgres）
docker volume ls | grep qiyun
```

---

## 9. 架构示意

```
Internet → :80 Nginx → 127.0.0.1:3001 API
                              ↓
                    Docker network (qiyun_internal)
                    ├── postgres
                    ├── redis
                    ├── minio
                    ├── qdrant
                    └── worker
```

---

## 10. 常见问题

**API 启动报 Missing env**

`loadApiEnv` 要求 `.env` 里所有键都有值（可为占位符）。对照 `infra/.env.ecs.example` 补全。

**文档上传后 worker 不处理**

确认 `DOCUMENT_QUEUE_DRIVER=redis` 且 `qiyun-worker` 容器在运行：`docker compose -f infra/docker-compose.ecs.yml ps`。

**CORS 错误**

把 `.env` 的 `CORS_ORIGIN` 改成 Console 实际访问地址（含端口），然后 `docker compose ... restart api`。

**内存不足**

8GiB 一般够用；若紧张可临时改 `.env`：

```env
VECTOR_STORE_DRIVER=memory
DOCUMENT_QUEUE_DRIVER=inline
```

并停掉 worker：`docker compose -f infra/docker-compose.ecs.yml stop worker qdrant minio`（仅演示，不推荐生产）。

---

## 11. 上线验收清单（30 分钟）

- [ ] `curl http://<公网IP>/health` 返回 `{"status":"ok"}`
- [ ] `curl http://<公网IP>/public/widget.js` 返回 JS
- [ ] Console 注册 / 登录 / 切换工作区
- [ ] 知识库上传 PDF → 状态 `ready`
- [ ] 机器人保存 `systemPrompt` 后刷新仍在
- [ ] 站点保存域名 → 重启 API 后仍在
- [ ] 站点「测试消息」返回 DeepSeek 回复
- [ ] 复制嵌入代码到 HTML 页面，Widget 可对话
- [ ] `.env` 中 `LLM_API_KEY`（DeepSeek）已配置且非 `replace-me`

**Console 本地 `.env.local`：**

```env
API_BASE_URL=http://101.201.63.118
NEXT_PUBLIC_WIDGET_URL=http://101.201.63.118
```
