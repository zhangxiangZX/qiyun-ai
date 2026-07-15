# MOD-07: widget-site 官网挂件/站点

## 开工流程

- **Task ID**：MOD-07-widget-site
- **用户价值/闭环**：审计 widget/site 后端完整度（创建站点→域名白名单→公开 widget 端点→嵌入代码→统计/线索闭环）
- **不做什么**：本模块无 gap，不修改任何代码
- **验收**：审计结论为 0 gap

## 审计范围

### 1. Site CRUD 路由（chat-route.service.ts）

| 路由 | 方法 | 角色保护 | 状态 |
|------|------|----------|------|
| /sites | GET | membership（read） | ✅ |
| /sites | POST | owner/admin（assertRoleAllowed） | ✅ |
| /sites/:id | PATCH | owner/admin | ✅ |
| /sites/:id/rotate-key | POST | owner/admin | ✅ |
| /sites/:id/test-message | POST | owner/admin + rate limit | ✅ |

### 2. 公开 Widget 端点（chat-route.service.ts）

| 路由 | 方法 | 域名白名单 | 状态校验 | 状态 |
|------|------|-----------|----------|------|
| /public/widget/config | GET | ✅ originAllowed | ✅ requireSite + requireBot | ✅ |
| /public/chat/stream | POST | ✅ originAllowed | ✅ requireSite + requireBot | ✅ |
| /public/leads | POST | ✅ originAllowed | ✅ requireSite + requireBot | ✅ |
| /public/leads/attachments | POST | - | ✅ requireSite | ✅ |
| /public/leads/attachments/:id | GET | - | ✅ RLS bypass（token 授权） | ✅ |

### 3. Bot 管理路由（rag-route.service.ts）

| 路由 | 方法 | 角色保护 | 状态 |
|------|------|----------|------|
| /bots | GET | membership | ✅ |
| /bots | POST | assertManagerRole | ✅ |
| /bots/:id | GET | membership | ✅ |
| /bots/:id | PATCH | assertManagerRole | ✅ |
| /bots/:id | DELETE | assertManagerRole | ✅ |
| /bots/:id/copy | POST | assertManagerRole | ✅ |
| /bots/:id/publish | POST | assertManagerRole | ✅ |
| /bots/:id/test-chat | POST | membership | ✅ |
| /bots/:id/embed-code | GET | membership | ✅ |

### 4. 安全机制

- **Site key 生产化**：migration 007 清除 `site_key` 明文，仅存 `site_key_hash` + `site_key_prefix`
- **Key 轮换审计**：`site_key_audits` 表记录 created/rotated 操作
- **域名白名单**：`originAllowed()` 含 `extractAllowedHostname` 子域名匹配逻辑
- **状态门控**：`requireSite()` 检查 `status !== "active"`（所有公开端点必经此路）
- **Bot 状态门控**：`requireBot()` 检查 `status !== "active"`
- **租户隔离**：所有 DB 查询过滤 `workspace_id = $1`

### 5. 嵌入代码

- Console 端 `buildEmbedSnippet()` 从 site key 生成 `<script>` 标签
- `embed-code` 端点仅返回 placeholder（key 在创建/轮换时暴露一次）
- `EmbedCodeCard` 组件：有 snippet 显示可复制代码，无则显示保护提示

### 6. 测试覆盖

- `site-key.test.ts`：已有 PG-free 测试（create/rotate/域名绕过防护）

## 审计结论

**零真实缺口。模块 07 无需代码改动。**

- 功能完整度：Site CRUD + Bot 管理 + 公开 Widget 端点 + 域名白名单 + Key 安全 + 嵌入代码
- 安全性：三层门控（域名白名单 → site 状态 → bot 状态），Key hash 存储不泄露明文
- 多租户：所有 DB 查询 workspace 隔离
- 一致性：与其他模块同模式（assertRoleAllowed、requireSite、租户上下文注入）

### 仅作记录的次要观察（非 gap）

1. 无 DELETE /sites/:id 端点：前端无此需求，暂不需要
2. 无 GET /sites/:id 端点：list + patch 覆盖当前用例
3. `sites` 表无 `created_at`/`updated_at` 列：前端 `mapApiSite` hardcode `new Date().toISOString()`
4. embed-code 端点返回 placeholder：由客户端 `buildEmbedSnippet` 生成的嵌入代码覆盖实际用例
