# MOD-10 · follow-task-record 跟进任务记录 — 审计 + 补齐

**Task ID**: MOD-10-follow-task-record  
**日期**: 2026-07-09  
**结论**: 真实缺口（PG 持久化缺失 + BFF 不完整），已补齐。

## 审计范围

Calendar 事件系统（核心"跟进任务"实体）的完整链路：API 路由 → CalendarRepository → CalendarApi → runtime.ts → DB 表 → Console BFF 代理。

## 审计发现

### 真实缺口
1. **无 PG 持久化**：`runtime.ts` 硬编码 `new InMemoryCalendarRepository()`，无 `driver === "postgres"` 分支。重启即丢所有跟进任务。
2. **无 DB 表**：所有 migration 中无 `calendar_events` 表。
3. **Console BFF 不完整**：仅 GET /calendar/events 代理，无 POST 创建、无 /calendar/events/[id] 子路由（GET/PATCH/DELETE）。

### 已有保障
- 角色保护：assertWriteRole（模块 03 已修）
- API 路由完整：GET/POST /calendar/events + GET/PATCH/DELETE /calendar/events/:id
- 请求验证：POST 必填字段检查 + 404 响应
- 租户隔离：InMemory 已有 workspaceId 键分离

## 修复内容

### 1. Migration 031_calendar_events.sql
新建 calendar_events 表：
- 字段：id, workspace_id, title, start, "end", kind, status, lead_id, lead_name, owner_name, note, created_at, updated_at
- 索引：idx_calendar_events_workspace (workspace_id, start), idx_calendar_events_workspace_range (workspace_id, start, "end")

### 2. CalendarRepository 异步化
- 接口方法全部改为返回 Promise
- InMemoryCalendarRepository 方法加 async
- seedIfEmpty 内部 count 改为 await

### 3. PostgresCalendarRepository（新建）
- 实现 CalendarRepository 全部 7 个方法
- 参数化 SQL，所有查询过滤 workspace_id
- 时间范围查询用 `start < $to and "end" > $from`（重叠检测）
- mapEvent 将 null → undefined（适配 CalendarEvent 类型）
- delete 简化返回 true（workspace_id+id 组合键已保证准确性）

### 4. CalendarApi 异步化
- 全部方法改为 async/await
- listEvents 的 seedIfEmpty 改为 await

### 5. CalendarRouteService 异步化
- 全部 `this.runtime.calendarApi.*` 调用加 await

### 6. CalendarRouteService 测试更新
- mock calendarApi 方法返回 Promise

### 7. runtime.ts
- 导入 PostgresCalendarRepository
- `driver === "postgres" ? new PostgresCalendarRepository() : new InMemoryCalendarRepository()`

### 8. Console BFF 补齐
- events/route.ts：新增 POST 处理器
- events/[id]/route.ts（新建）：GET, PATCH, DELETE 处理器

## 验收
- `typecheck` 0 错
- scoped `eslint` 0 错（仅 1 个预存 warning）
- `node --test` calendar 单测 3/3 通过
