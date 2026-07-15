# qiyuntu.cn 正式域名绑定（归档说明）

> **正式域名已冻结**：请以 [docs/38-production-domains.md](./38-production-domains.md) 为准。  
> 本文档旧方案 `app.qiyuntu.com` / `api.qiyuntu.com` 已废弃，仅保留操作步骤骨架并改写为当前五域名。

ECS 公网 IP 示例：`101.201.63.118`（以实际为准）

## 子域名规划

| 域名 | 用途 | Nginx |
|------|------|--------|
| `www.qiyuntu.cn` | 产品官网 | `infra/nginx/qiyun-public.conf` |
| `console.qiyuntu.cn` | 企业管理后台 | `infra/nginx/qiyun-console.conf` |
| `api.qiyuntu.cn` | 业务 API | `infra/nginx/qiyun-api.conf` |
| `go.qiyuntu.cn` | 选型页 / 销售链接 / 客户报价 | `infra/nginx/qiyun-public.conf` |
| `cdn.qiyuntu.cn` | Widget 静态脚本 | `infra/nginx/qiyun-public.conf` |

Console 容器内仍通过 Docker 内网 `API_BASE_URL=http://api:3001` 访问 API，**不要**把容器内地址改成公网域名。

---

## 1. DNS 解析

```
www.qiyuntu.cn       →  A  →  <ECS_IP>
console.qiyuntu.cn   →  A  →  <ECS_IP>
api.qiyuntu.cn       →  A  →  <ECS_IP>
go.qiyuntu.cn        →  A  →  <ECS_IP>
cdn.qiyuntu.cn       →  A  →  <ECS_IP>
```

---

## 2. 安全组

| 端口 | 授权对象 | 用途 |
|------|----------|------|
| 22 | 办公 IP | SSH |
| 80 | 0.0.0.0/0 | HTTP（certbot 与初始探活） |
| 443 | 0.0.0.0/0 | HTTPS |

**不要**对公网开放：5432、6379、9000、6333、3000、3001。

---

## 3. ECS 环境变量

在 `/opt/qiyun-ai/.env`（可从 `infra/.env.ecs.example` 复制）：

```env
APP_URL=https://console.qiyuntu.cn
PUBLIC_SITE_URL=https://www.qiyuntu.cn
PUBLIC_API_URL=https://api.qiyuntu.cn
PUBLIC_ENTRY_URL=https://go.qiyuntu.cn
NEXT_PUBLIC_WIDGET_URL=https://cdn.qiyuntu.cn
CORS_ORIGIN=https://www.qiyuntu.cn,https://console.qiyuntu.cn,https://go.qiyuntu.cn
COOKIE_SECURE=true

EMAIL_FROM=noreply@qiyuntu.cn
EMAIL_REPLY_TO=sales@qiyuntu.cn
```

部署或改 env 后重启：

```bash
cd /opt/qiyun-ai
docker compose -f infra/docker-compose.ecs.yml up -d --build
```

---

## 4. Nginx

```bash
cd /opt/qiyun-ai

sudo cp infra/nginx/qiyun-api.conf /etc/nginx/sites-available/qiyun-api
sudo cp infra/nginx/qiyun-console.conf /etc/nginx/sites-available/qiyun-console
sudo cp infra/nginx/qiyun-public.conf /etc/nginx/sites-available/qiyun-public
sudo ln -sf /etc/nginx/sites-available/qiyun-api /etc/nginx/sites-enabled/qiyun-api
sudo ln -sf /etc/nginx/sites-available/qiyun-console /etc/nginx/sites-enabled/qiyun-console
sudo ln -sf /etc/nginx/sites-available/qiyun-public /etc/nginx/sites-enabled/qiyun-public
sudo rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/qiyun-unified
sudo nginx -t && sudo systemctl reload nginx
```

探活（证书前可用 HTTP）：

```bash
curl -I http://api.qiyuntu.cn/health
curl -I http://console.qiyuntu.cn/login
curl -I http://www.qiyuntu.cn/
```

HTTPS：

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx \
  -d www.qiyuntu.cn \
  -d console.qiyuntu.cn \
  -d api.qiyuntu.cn \
  -d go.qiyuntu.cn \
  -d cdn.qiyuntu.cn
```

---

## 5. 验收清单

- [ ] `https://api.qiyuntu.cn/health` 返回 ok
- [ ] `https://console.qiyuntu.cn/login` 可打开
- [ ] `https://www.qiyuntu.cn` 可打开
- [ ] `https://go.qiyuntu.cn` 选型/客户入口正常
- [ ] `https://cdn.qiyuntu.cn/public/widget.js` 可加载
- [ ] 嵌入代码含 `data-api-base="https://api.qiyuntu.cn"`（CDN ≠ API）
- [ ] Cookie / 登录在 HTTPS 下正常（`COOKIE_SECURE=true`）

部署脚本示例：

```bash
QIYUN_CONSOLE_URL=https://console.qiyuntu.cn \
QIYUN_API_URL=https://api.qiyuntu.cn \
QIYUN_WIDGET_URL=https://cdn.qiyuntu.cn \
bash infra/ecs/deploy-full.sh
```
