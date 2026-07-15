# PRD：业务规则配置功能

> 文档类型：功能规格（Feature Spec / PRD）
> 关联缺陷：D2（后端 500）、D3（无 preview 兜底）
> 作者：产品通 ｜ 日期：2026-07-08

---

## 1. Why（为什么做）

销售在使用 AI 助手时，需要统一、可配置的业务规则来约束助手行为——例如"报价前必须收集客户预算""未命中知识库时引导留资""涉及价格优惠需转人工"。当前该功能的配置页面 `/dashboard/settings/business-rules` 在 upstream 模式下**完全不可用**：

- 后端 `GET /settings/business-rules` 返回 **500**（`sales.service.ts:64` 调 `salesRepository.getBusinessRules` 抛未捕获异常，兜底成 `INTERNAL_ERROR`）；
- BFF `/api/settings/business-rules` 在 preview 模式直接返回 **503**，连降级数据都没有；
- 前端 `BusinessRulesWorkspace` 虽以 `PRESET_RULES` 兜底渲染，但用户看到的是"错误横幅 + 预置规则"，感知为"没数据 / 加载不出来"。

**目标**：让业务规则功能在 upstream 与 preview 两种模式下都能稳定读取与保存，且后端异常返回结构化错误而非 500 兜底。

---

## 2. 用户故事

- 作为**销售管理员**，我希望在"业务规则"页查看当前生效的规则集，以便确认助手行为符合公司策略。
- 作为**销售管理员**，我希望修改某条规则（如开关、阈值）并保存，以便实时调整助手约束。
- 作为**销售管理员**，当接口异常时，我希望看到**明确的错误原因和重试入口**，而不是空白页。
- 作为**系统**，我希望规则按 workspace 隔离存储，避免跨租户污染。

---

## 3. 范围（Scope）

### In Scope
- `GET /settings/business-rules`：返回当前 workspace 的规则集（含默认值兜底）。
- `PATCH /settings/business-rules`：局部更新规则（仅 manager 角色），写回并持久化。
- 前端读取/保存/错误态/重试。
- preview 模式下返回确定性 mock（而非 503）。

### Non-Goals（明确不做）
- 不做规则的可视化编排/拖拽（本期仅表单式开关与阈值）。
- 不做规则的版本历史与回滚（下个迭代再议）。
- 不在此页做"知识库"与"业务规则库"的内容管理（那是知识库页职责）。

---

## 4. 功能需求

| 编号 | 需求 | 验收标准 |
|------|------|----------|
| FR1 | 读取规则 | `GET` 返回 200 + `BusinessRulesPayload`；workspace 无记录时返回 `defaultBusinessRulesPayload()` |
| FR2 | 保存规则 | `PATCH` 仅 manager 可调用；200 返回更新后全量；非 manager 返回 403 |
| FR3 | **异常不 500** | repository 层任何异常必须被 `toSalesHttpError` 映射为结构化错误（4xx/特定 5xx），禁止裸抛成 `INTERNAL_ERROR` 兜底 |
| FR4 | preview 兜底 | BFF 在 preview 模式返回确定性 mock 规则，而非 503 |
| FR5 | 前端错误态 | 读取失败显示可读错误文案 + "重试"按钮；不静默降级为预置规则掩盖故障 |
| FR6 | 持久化 | 保存后 `runtime.persist()` 被调用；重启进程后（memory 模式）数据仍在当前进程生命周期内 |

---

## 5. 验收测试（Definition of Done）

- [ ] `GET /settings/business-rules`（带有效 token）返回 **200**，body 含 `rules` 字段。
- [ ] workspace 无记录时返回默认值，不 500。
- [ ] `PATCH` 非 manager 角色返回 **403**（非 500）。
- [ ] repository 抛错时返回**结构化错误码**（如 `SALES_RECORD_NOT_FOUND`），响应体含 `code`+`message`，不再是 `INTERNAL_ERROR`。
- [ ] preview 模式 BFF 返回 200 + mock，不再 503。
- [ ] 前端错误态显示文案 + 重试按钮，且不再用 `PRESET_RULES` 掩盖故障。
- [ ] 实测（带 token）：`curl 3001/settings/business-rules → 200`。

---

## 6. 指标（Success Metrics）

| 指标 | 基线 | 目标 |
|------|------|------|
| 业务规则页加载成功率（2xx 占比） | 0%（当前 500） | ≥ 99% |
| 规则保存成功率 | — | ≥ 99% |
| 因该页"加载不出来"的反馈数 | 存在 | 0 |

---

## 7. 风险与依赖

- **依赖 D1**：该路由 500 的根因可能源于 `salesRepository` 在 3001 旧构建中未正确初始化/注入；重建 3001 后需复测。
- **隐私合规**：规则可能含"报价阈值""转人工条件"等内部策略，接口需 workspace 隔离 + 角色校验（FR2 已覆盖）。
- **前端 PR**：`BusinessRulesWorkspace` 当前 `catch` 后仍以 `PRESET_RULES` 渲染（`:317-319, :437`），需改为"错误态优先、可重试"，否则故障被掩盖。

---

## 8. 备注（根因定位证据）

- 路由存在（`sales-route.service.ts:280` 已注册），但处理时 `salesApi.getBusinessRules` → `sales.service.ts:64` `this.salesRepository.getBusinessRules(workspaceId)` 抛未映射异常。
- 带假 token 探测：`/settings/business-rules → 500`，body `{"code":"INTERNAL_ERROR","message":"Unexpected error."}`。
- 同类 500 还出现在 `/inquiries`、`/customer-opportunities`、`/customer-operations/recommendations`，属同一类"未捕获异常"问题，建议统一在 `toSalesHttpError` / repository 层修复。
