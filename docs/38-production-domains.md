# 企云图 AI 正式域名（冻结）

最后更新：2026-07-12

| 域名 | 职责 | 上游 |
| --- | --- | --- |
| `https://www.qiyuntu.cn` | 产品官网、试用申请 | Console / Next.js |
| `https://console.qiyuntu.cn` | 企业管理后台 | Console / Next.js |
| `https://api.qiyuntu.cn` | 业务 API、公开聊天与上传 | API |
| `https://go.qiyuntu.cn` | AI 选型页、销售链接、客户报价 | Console；`/public/sales-links/*` 分流到 API |
| `https://cdn.qiyuntu.cn` | Widget 静态脚本 | API `/public/widget.js` |

## 部署注意

- Console **容器内**访问 API 继续用 `http://api:3001`，不要改成公网域名。
- 浏览器公开地址一律用上表 HTTPS。
- Widget 嵌入代码必须同时带 CDN 脚本地址与 `data-api-base="https://api.qiyuntu.cn"`，**不能**把 CDN 当成业务 API。
- `cdn.qiyuntu.cn` 只开放 Widget 资源，不转发管理 API。

```env
APP_URL=https://console.qiyuntu.cn
PUBLIC_SITE_URL=https://www.qiyuntu.cn
PUBLIC_API_URL=https://api.qiyuntu.cn
PUBLIC_ENTRY_URL=https://go.qiyuntu.cn
NEXT_PUBLIC_WIDGET_URL=https://cdn.qiyuntu.cn
CORS_ORIGIN=https://www.qiyuntu.cn,https://console.qiyuntu.cn,https://go.qiyuntu.cn
COOKIE_SECURE=true
```

DNS：五个主机名均 A 记录指向 ECS 公网 IP。证书建议一次申请五域名（或分别签发）后由 Nginx/Certbot 终结 HTTPS。

历史 `app.qiyuntu.com` / `api.qiyuntu.com` 方案已废弃，见旧稿 `docs/34-qiyuntu-domain-setup.md`（仅作归档）。
