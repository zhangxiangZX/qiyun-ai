# AGENTS.md

你正在开发 **AI云 · 工业官网获客系统**（工业设备制造企业官网：AI 接待、产品咨询、询盘留资、线索跟进）。

## 文档优先级（高 → 低）

1. **docs/AI云_项目核心需求护栏与开发防跑偏规则_V1.0.md**（最高，高于临时需求与扩展建议）
2. **docs/AI云_第一版全部功能可用清单_MVP_V1.0.md**（V1.0 唯一开发边界；未列出功能 → BACKLOG）
3. docs/AI云_工业官网获客系统_核心项目书_V1.0.docx
3. docs/17-p0-collaboration-briefs.md
4. docs/tasks/{Task-ID}.md（当前任务说明，缺则禁止编码）
5. docs/02-prd-mvp.md
6. docs/05-api-contract.md
7. docs/07-design-system.md
8. docs/09-ai-development-rules.md

暂缓需求只写入 **docs/BACKLOG.md**，不得直接开发。

## 产品唯一闭环

```text
官网访客 → AI 基于企业资料回答 → 识别高意向 → 留资 → 销售跟进 → 补充资料
```

任何功能若不能增强此闭环，停止开发并标记 Backlog。

## 分工

| 角色 | 目录 |
|------|------|
| **Codex** | `apps/api/**`、`apps/worker/**`、`infra/**`、migration、SSE、RAG、鉴权 |
| **Cursor** | `apps/console/**`、`apps/widget/**`、`packages/ui/**`、页面与 Widget UI |

禁止两人同时改：同一文件、同一 API route、同一 migration、同一 Widget 入口、同一共享类型。

协作顺序：**Codex 定契约 → Cursor Mock/UI → Cursor 接真接口 → Codex 集成验证**。

## 开工流程（编码前必输出）

1. 任务用户价值与闭环环节
2. **不做什么**
3. 将修改 / 不会修改的文件清单
4. 验收方式
5. 是否超出 P0/P1（超出则停止）

没有 Task ID、没有「不做什么」、没有验收标准 → **禁止开始编码**。

## 工作方式

- 一次只做一个 Task ID；单次 PR 对应一个可验收结果
- 只实现该任务，避免无关重构、不追加 P2、不替换技术栈
- 变更数据库必须新增 migration（Cursor 任务通常写「无」）
- 完成后报告：改动文件、测试命令与结果、接口/DB 变化、已知限制、**仅 1 个**紧邻下一步 Task

## 验证

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 开工提示词

见护栏文档 §11，或：

```text
请先阅读 AGENTS.md、护栏 V1.0、核心项目书、当前 docs/tasks/{Task-ID}.md。
输出理解、闭环环节、不做什么、文件清单、验收方式后再编码。
```
