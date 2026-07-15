# 选型页提交记录 UI 优化完成

## 完成内容

1. 修复 dev server 中断
   - 3100 上游模式 console 因之前 kill-all node 进程时连带挂掉，已用 `run_in_background` 可靠重启。
   - API(3001) 保持存活，首页/站点页可正常访问。

2. 提交记录页重新接入当前编辑器
   - 发现 `SelectionSubmissionsWorkspace` 实际未挂载到任何路由：现有编辑器 `AiStandaloneEditWorkspace` 没有提交记录 tab，旧的 `selection-editor-workspace.tsx` 是死代码。
   - 在 `ai-standalone-shared.ts` 新增 `"submissions"` 章节。
   - 在 `ai-standalone-edit-workspace.tsx` 渲染 `SelectionSubmissionsWorkspace`；同时兼容 `tab=submissions` 旧链接。

3. 优化提交记录视觉细节
   - 左右栏比例更合理；列表选中态加蓝色左侧边条。
   - 联系方式、选型答案、附件、关联线索区块统一标题图标与背景。
   - 选型答案改用 2 列网格，值用前景色突出。
   - 附件下载按钮改为 ghost 蓝色，底部操作按钮完整可见。

## 验证

- Playwright 截图确认页面可访问、布局正常。
- `pnpm --filter qiyun-console typecheck` 通过。
- 修改文件 eslint 0 错误。
- 全量 `pnpm lint` 因既有 3 个 `react-hooks/exhaustive-deps` warning（无关文件）失败，非本次引入。

## 相关文件

- `apps/console/src/lib/channels/ai-standalone-shared.ts`
- `apps/console/src/components/channels/ai-standalone-edit-workspace.tsx`
- `apps/console/src/components/bots/selection-submissions-workspace.tsx`
- 工作日志：`E:\qiyun-ai\.workbuddy\memory\2026-07-11.md`
