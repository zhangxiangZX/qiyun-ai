# 当前任务看板

Qiyun AI / 企云 AI

> V1.0 开发边界：仅实现 `docs/AI云_第一版全部功能可用清单_MVP_V1.0.md` 内能力。  
> 差距追踪见 `docs/MVP-V1-0-GAP-STATUS.md`，V2 需求见 `docs/BACKLOG.md`。

## Doing

- [ ] I-09 全链路 Demo 验收（需 Console + API 同时运行后执行 `scripts/run-demo-acceptance.ps1`）

## Ready for Codex（V1.0 P0）

| Priority | ID | Task | 状态 |
|----------|----|------|------|
| 1 | E-04 | 留资附件上传与存储收口 | ✅ 代码完成 |
| 2 | E-08 | 同会话留资去重收口 | ✅ 代码+契约完成 |
| 3 | I-09 | Demo 数据与演示脚本 | 🟡 脚本已有，待实机跑通 |

## Ready for Cursor（V1.0 P0）

| Priority | ID | Task | 状态 |
|----------|----|------|------|
| 1 | H-05 / H-06 | 站点安装向导 + Widget 加载校验 | ✅ |
| 2 | G-01 / G-02 | Dashboard / 报表 Upstream 筛选 | ✅ |
| 3 | F-05 / F-08 | 线索附件展示 + 跟进时间线 | ✅ |
| 4 | 团队 / 通知 UI 收边 | 对齐新角色文案、6 态线索、真实通知源 | ✅ |

## Done（近期）

- [x] E-04 / F-05 留资附件 `ready/failed` 态 + `errorMessage` + 下载拦截
- [x] E-08 同会话留资去重契约 + 边界测试
- [x] F-08 线索跟进时间线持久化（`follow_up_records` + PATCH 追加）
- [x] G-01 / G-02 概览 + 报表 `from/to/botId` 筛选
- [x] C-01 会话服务端筛选
- [x] N-01 / N-02 通知已读 + feed kind
- [x] D-01 Dashboard / Reports 查询参数
- [x] S-01 / K-01 Site key hash + MinIO 存储
- [x] P2-3 API 全局限流 `api.global.ip`
- [x] migration `015_lead_follow_up_records.sql`

## Pause（非 V1.0）

- SQL 向量仓储彻底替换 Qdrant
- 更换 Embedding 供应商策略
- 所有 `docs/BACKLOG.md` 中的 V2 功能
