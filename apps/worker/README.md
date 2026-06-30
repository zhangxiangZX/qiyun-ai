# qiyun-worker

当前阶段提供 `C-02` 所需的最小处理器能力：
- 文档状态流转：`uploaded -> parsing -> indexing -> ready|failed`
- 基于文件名模拟失败场景
- 供后续接入 BullMQ / Redis / 真正解析器的纯逻辑入口
