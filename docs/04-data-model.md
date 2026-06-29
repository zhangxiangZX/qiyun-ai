# 04 数据模型（MVP）

## 1. 核心实体
| 表 | 说明 | 关键字段 |
|---|---|---|
| users | 用户 | id, email, password_hash, name, status |
| workspaces | 企业工作区 | id, name, slug, owner_id |
| workspace_members | 成员与角色 | workspace_id, user_id, role |
| bots | 机器人 | id, workspace_id, name, status, system_prompt, model |
| bot_knowledge_bases | 机器人与知识库关联 | bot_id, knowledge_base_id, sort_order, enabled |
| sites | 已接入站点 | id, workspace_id, bot_id, site_key_hash, site_key_prefix, allowed_domains |
| knowledge_bases | 知识库 | id, workspace_id, name, status |
| documents | 原始文档 | id, knowledge_base_id, file_name, storage_key, status |
| document_chunks | 文本块元数据 | id, document_id, content, token_count, vector_point_id |
| conversations | 会话 | id, workspace_id, bot_id, visitor_id, status |
| messages | 消息 | id, conversation_id, role, content, model, latency_ms |
| message_citations | 引用 | message_id, document_chunk_id, score |
| leads | 线索 | id, workspace_id, bot_id, conversation_id, status |
| lead_fields | 留资字段 | lead_id, field_key, field_value |
| api_keys | API Key | id, workspace_id, name, key_prefix, key_hash, revoked_at |
| audit_logs | 审计日志 | id, workspace_id, actor_id, action, resource_type, resource_id |

## 2. 关键约束
- `users.email` 唯一。
- `workspace_members(workspace_id, user_id)` 唯一。
- `sites.site_key_hash` 唯一，`site_key` 只在创建或轮换时明文返回一次；`site_key_prefix` 仅用于展示。
- 每张租户表必须有 `workspace_id`，即使可经外键推导，也保留用于高效过滤。
- `document_chunks.content` 不存向量；向量只存 Qdrant，数据库存 point ID。
- 软删除字段：`deleted_at` 用于 bots、knowledge_bases、documents、leads。
- 业务唯一约束使用部分唯一索引或仅约束 `deleted_at IS NULL` 的活跃记录，避免软删除后无法重建同名资源。
- `bot_knowledge_bases(bot_id, knowledge_base_id)` 唯一，避免重复绑定。

## 3. 索引建议
- conversations(workspace_id, bot_id, created_at desc)
- messages(conversation_id, created_at)
- leads(workspace_id, status, created_at desc)
- documents(knowledge_base_id, status)
- audit_logs(workspace_id, created_at desc)
