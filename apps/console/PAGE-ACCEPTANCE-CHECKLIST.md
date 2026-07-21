# Console 全页面人工验收清单

Last updated: 2026-07-05

配合 [docs/21-page-acceptance-runbook.md](../../docs/21-page-acceptance-runbook.md) 使用。

Base URL: `http://localhost:3010`

## 验收前准备

- [ ] Console 可访问
- [ ] API health 可访问（`http://localhost:3001/health`）
- [ ] 分别准备 **演示模式**（未配置 `API_BASE_URL`）与 **正式 API 模式**（已配置并登录）各跑一轮

## 模式文案统一验收（H-10）

每个页面检查：

- [ ] 顶部或 Alerts 区有 **ConsoleDataModeBanner**（演示 = 黄色 warning；正式 = 绿色 success）
- [ ] 页头 **ConsoleModeBadge** 显示「演示模式」或「正式 API」
- [ ] **保存/创建成功** 文案在演示模式下明确写「演示数据 / 不会同步至 apps/api」
- [ ] **正式 API 模式** 成功文案写「已保存至 apps/api」或等价表述
- [ ] loading / empty / error 状态均能看到模式提示，不因加载态隐藏

| 页面 | 路由 | Banner feature | 额外 footnote | 写入验收 |
|------|------|----------------|---------------|----------|
| 数据看板 | `/dashboard` | 概览 | AnalyticsDataFootnote | 无写入；筛选 disabled 时有 tooltip |
| 报表 | `/dashboard/reports` | 报表 | AnalyticsDataFootnote | 无写入 |
| 机器人列表 | `/dashboard/bots` | 机器人 | ReadOnlyNotice（演示） | 创建成功区分模式 |
| 机器人编辑 | `/dashboard/bots/:id/*` | 机器人编辑 | ReadOnlyNotice（演示） | 保存成功区分模式 |
| 线索 | `/dashboard/leads` | 线索 | DetailSheet ReadOnlyNotice | 保存成功区分模式 |
| 站点 | `/dashboard/sites` | 站点 | InstallWizard PreviewNotice | 域名/密钥成功区分模式 |
| 通知 | 顶栏铃铛 | （feed previewHint） | NotificationPanel Alert | 已读移除，无假成功 |

## 逐页功能验收（I-11）

### 公开入口

- [ ] `/` 无运行时错误
- [ ] `/login` 密码 / 验证码登录
- [ ] `/trial` 提交试用

### 超管

- [ ] `/dashboard/super-admin` 试用审批

### 业务页面

- [ ] `/dashboard` KPI / 图表 / 空态
- [ ] `/dashboard/knowledge-bases` 上传 / 删除 / 失败态
- [ ] `/dashboard/bots` 列表 / 创建 / 编辑 / 预览
- [ ] `/dashboard/conversations` 列表 / 详情 / 高意向跟进栏
- [ ] `/dashboard/leads` 筛选 / 详情 / 导出
- [ ] `/dashboard/sites` 白名单 / 密钥 / 测试消息
- [ ] `/dashboard/team` 邀请 / 角色
- [ ] `/dashboard/reports` 聚合 / 筛选
- [ ] `/dashboard/system-status` 健康探测

### 移动端抽检

- [ ] 会话页：通知跳转后跟进操作栏 + 详情 Sheet
- [ ] 线索 / 站点：Sheet 与 Banner 可读

## 退出标准

- [ ] 关键页无 runtime crash
- [ ] 演示模式无「已保存至真实后端」类假成功
- [ ] 正式 API 模式无静默 mock 回退
- [ ] 模式 Banner 与 Badge 全页一致

## 记录模板

```
日期：
验收人：
模式：preview / upstream
页面：
结果：PASS / FAIL
备注：
```
