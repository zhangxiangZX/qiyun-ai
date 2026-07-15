# qiyun-ai 数据库备份 / 恢复 / 导出脚本

本目录包含针对 qiyun-ai 后端 Postgres 数据库的运维脚本。后端直接使用 `pg` 驱动、无 ORM，因此脚本通过 PostgreSQL 官方客户端 `pg_dump` / `psql` 操作数据库。

| 脚本 | 作用 |
| --- | --- |
| `backup.sh` | 全量备份整库为 SQL 文件，保留最近 14 份 |
| `restore.sh` | 从 SQL 备份文件恢复数据库（会覆盖现有数据） |
| `export.sh` | 将指定表（或默认核心表）导出为 CSV，供运营使用 |
| `db-backup.cron` | crontab 定时备份示例 |

---

## 前置依赖

1. **PostgreSQL 客户端**：本机需安装 `pg_dump` 与 `psql`，并位于 `PATH` 中。
   - 通常随 PostgreSQL Server 安装；也可只装 `postgresql-client`（Linux）/`libpq`（macOS `brew install libpq`）。
   - 验证：`pg_dump --version` 与 `psql --version` 能正常输出版本。
2. **Node.js**：用于解析 `.env` 中的 `DATABASE_URL`（无需任何 npm 依赖，仅用内置 `fs` / `url`）。
3. **数据库连接配置**：`.env` 中需存在 `DATABASE_URL`，形如：
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```
   - 脚本按以下顺序查找 `.env`：
     1. 环境变量 `ENV_FILE` 指定的路径；
     2. `$REPO_ROOT/apps/api/.env`；
     3. `$REPO_ROOT/.env`（仓库根目录）。
   - 解析使用 Node 的 `URL` 解析，并对密码做 `decodeURIComponent`，因此密码中含有 `@`、`:`、`/`、`%` 等特殊字符也能正确处理（**不要**用简单 `sed` 按分隔符切割连接串）。
4. 运行脚本的机器需能网络连通数据库所在主机/端口，且所用账号具备相应权限（备份需读权限，恢复/导出需对应表权限）。

> 本仓库当前 `.env` 位于仓库根目录；若你的部署在 `apps/api/.env`，脚本同样兼容。

---

## 脚本用法

### 1. 备份（backup.sh）

```bash
# 在仓库根目录执行
bash scripts/db-backup/backup.sh

# 或指定 .env 路径
ENV_FILE=/path/to/.env bash scripts/db-backup/backup.sh
```

- 输出文件：`scripts/db-backup/backups/qiyun_ai_YYYY-MM-DD_HH-MM.sql`
- 自动保留最近 **14** 份，超出后删除最旧的。
- 备份文件权限设为 `600`（含敏感数据）。
- 若 `pg_dump` 缺失或 `.env` 不存在，脚本输出清晰错误并以非零状态退出，不会崩溃。

### 2. 恢复（restore.sh）

```bash
bash scripts/db-backup/restore.sh backups/qiyun_ai_2026-07-07_03-30.sql
```

- 必须传入一个 SQL 备份文件路径参数。
- 执行前会**明确要求确认（输入 YES）**，并提示先备份、说明将覆盖现有数据。
- 使用 `psql --single-transaction -f <file>` 在一个事务内恢复；备份文件由 `backup.sh` 以 `--clean --if-exists` 生成，会先清理再重建对象。
- ⚠️ 恢复不可逆，务必先对当前库做新备份。

### 3. 导出 CSV（export.sh）

```bash
# 导出默认核心表：leads / conversations / inquiries / quotes
bash scripts/db-backup/export.sh

# 仅导出一个表
bash scripts/db-backup/export.sh leads
```

- 输出文件：`scripts/db-backup/exports/<表名>_YYYY-MM-DD.csv`
- 使用 `\copy ... TO STDOUT WITH (FORMAT csv, HEADER true)`，文件权限 `600`。
- 若某表不存在或无权访问，会跳过并提示，不影响其它表。

---

## 从备份恢复的步骤（标准流程）

1. **先备份当前数据**（防止恢复后发现问题无法回退）：
   ```bash
   bash scripts/db-backup/backup.sh
   ```
2. **确认备份文件与目标环境**（确认 `.env` 指向要恢复的库）。
3. **执行恢复并输入 YES 确认**：
   ```bash
   bash scripts/db-backup/restore.sh backups/qiyun_ai_xxx.sql
   ```
4. **校验**：恢复后检查关键表行数 / 应用健康状态。

---

## 安装定时备份（cron）

编辑 `db-backup.cron`，把其中的 `/path/to/qiyun-ai` 替换为本机仓库实际绝对路径，然后：

```bash
# 方式 A：整体安装（会覆盖当前用户全部 crontab，谨慎）
crontab scripts/db-backup/db-backup.cron

# 方式 B（推荐）：手动追加，不覆盖已有任务
crontab -e
# 粘贴 db-backup.cron 中最后一行 30 3 * * * ... 后保存
```

示例任务为**每天 03:30** 执行全量备份，日志追加到 `backups/backup.log`。
可用 `crontab -l` 查看已安装任务，`tail -f scripts/db-backup/backups/backup.log` 查看运行日志。

> Windows / Git Bash 用户：cron 通常不可用，可改用 Windows 任务计划程序（Task Scheduler）调用 `bash.exe scripts/db-backup/backup.sh`。

---

## 注意事项

- **备份 / 导出文件含敏感数据**：已设为 `chmod 600`，请勿提交进 git，不要放到公网可访问的位置。
- **离线留存**：定时备份只存在本地 `backups/`，建议另行同步到安全存储（对象存储 / 异地服务器）。
- **定期演练恢复**：备份价值在于能恢复，请定期做一次恢复演练。
- **密码特殊字符**：已在解析层处理；若手动写连接串，注意对密码中的特殊字符做百分号编码。
- **不要改动 `apps/api` 源码**：这些脚本完全独立于应用代码。
