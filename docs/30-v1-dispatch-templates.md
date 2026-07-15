# 企云图 AI V1 固定派工模板

最后更新：2026-07-10

## 用途

这份文档提供两类固定模板：

1. 发给 Cursor 的前端 / UI 派工模板
2. 发给 Codex 的后端 / 联调 / 验收派工模板

使用前先确认：

- 验收边界：`docs/28-v1-acceptance-matrix.md`
- 最终清单：`docs/29-v1-final-page-checklist.md`
- 当前任务板：`TASKS.md`

---

## 一、发给 Cursor 的固定模板

### 模板 A：页面收边

```md
阅读以下文件后开始：
- /E:/qiyun-ai/docs/28-v1-acceptance-matrix.md
- /E:/qiyun-ai/docs/29-v1-final-page-checklist.md
- /E:/qiyun-ai/TASKS.md

你是本项目的前端 / UI 负责人。
只允许修改 `apps/console` 和 `packages/ui`。

当前任务：
[填写模块名] / [填写页面名]

要求：
1. 不修改后端 API、数据库、Docker、鉴权。
2. 所有页面必须补齐 loading / empty / error / success 状态。
3. 不允许出现 `#` 假链接或无反馈按钮。
4. 所有文案必须是正式中文，不能保留乱码或演示占位文案。
5. 保持当前 V1 验收边界，不要引入 V2 功能。
6. 桌面端和移动端都要可用。
7. 完成后列出修改文件，并运行：
   - lint
   - typecheck
```

### 模板 B：页面联调

```md
阅读以下文件后开始：
- /E:/qiyun-ai/docs/28-v1-acceptance-matrix.md
- /E:/qiyun-ai/docs/29-v1-final-page-checklist.md
- /E:/qiyun-ai/TASKS.md

你是本项目的前端 / UI 负责人。
只允许修改 `apps/console` 和 `packages/ui`。

当前任务：
[填写模块名] / [填写页面名] 联调收尾

要求：
1. 只接入当前已存在接口，不新增后端协议。
2. 若接口能力不足，保留只读或预览降级，不要伪造成功写入。
3. 页面必须明确区分正式数据和预览数据。
4. 所有联调失败都要给出清晰用户提示。
5. 不修改 V1 边界外的页面。
6. 完成后列出修改文件，并运行：
   - lint
   - typecheck
```

### 模板 C：按审查意见返工

```md
根据以下审查意见修复问题。

规则：
1. 只修 P0 / P1 问题。
2. 不重构无关代码。
3. 不改后端 API、数据库、Docker、鉴权。
4. 修完后重新运行 lint 和 typecheck。

[粘贴审查意见]
```

---

## 二、发给 Codex 的固定模板

### 模板 D：后端实现

```md
阅读以下文件后开始：
- /E:/qiyun-ai/docs/28-v1-acceptance-matrix.md
- /E:/qiyun-ai/docs/29-v1-final-page-checklist.md
- /E:/qiyun-ai/TASKS.md

你是本项目的后端工程负责人。
只允许修改 `apps/api`、`apps/worker`、`infra`、数据库 schema 与 migration。

当前任务：
[填写模块名] / [填写任务名]

要求：
1. 先列出实施计划和受影响文件。
2. 必须遵守 workspace 多租户隔离。
3. 不新增 V2 范围能力。
4. 完成后运行：
   - lint
   - typecheck
   - test
5. 输出：
   - 改动说明
   - 测试结果
   - 已知限制
```

### 模板 E：联调兜底

```md
阅读以下文件后开始：
- /E:/qiyun-ai/docs/28-v1-acceptance-matrix.md
- /E:/qiyun-ai/docs/29-v1-final-page-checklist.md
- /E:/qiyun-ai/TASKS.md

你是本项目的后端工程负责人。

当前任务：
[填写页面名] 联调兜底

要求：
1. 检查前端使用的接口是否真实可用。
2. 若前端超前于接口，给出最小可行后端补齐方案。
3. 不引入 V2 功能。
4. 完成后输出：
   - 可合并
   - 需返工
   - 阻塞项
```

### 模板 F：正式验收

```md
按 `/E:/qiyun-ai/docs/29-v1-final-page-checklist.md` 逐项验收。

要求：
1. 先跑自动化检查。
2. 再按页面逐项确认。
3. 所有结论必须写入验收记录。
4. 明确区分：
   - 已通过
   - 部分通过
   - 阻塞
5. 最后给出是否可进入发布候选结论。
```

---

## 三、推荐用法

### 先派 Cursor

适合：

- 页面收边
- 响应式
- 空态 / 错误态
- 交互反馈
- 表单体验

### 再派 Codex

适合：

- 联调补齐
- 接口兜底
- 回归测试
- 发布前验收

---

## 四、和本项目文档的关系

- 验收边界：`docs/28-v1-acceptance-matrix.md`
- 最终清单：`docs/29-v1-final-page-checklist.md`
- 任务板：`TASKS.md`
