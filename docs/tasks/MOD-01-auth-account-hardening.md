# MOD-01-auth-account-hardening

## 用户价值

模块 01「账号权限」在 V1.0 已建成（注册/登录/邀请/找回密码/邮箱码登录/refresh 轮换）。本次为安全架构师视角的**针对性加固**，关闭两个在审计中确认的硬伤，不涉及功能新增。

## 闭环环节

账号安全基线（防时序侧信道 + 防账号枚举）→ 提升整体认证链路抗攻击能力。

## 不做什么

- 不调整 scrypt 成本参数（默认 scrypt 已属内存硬化，改动有性能/兼容风险，非缺口）。
- 不改动邮箱码登录自动开通工作空间的产品行为（非漏洞，属产品决策）。
- 不提升密码强度策略 6→8（产品决策，会破坏现有测试账号）。
- 不引入按 email 维度的限流（现有按 client IP 限流已有效，属增强项非缺口）。
- 不触碰 refresh token 轮换/回收（已实现 revoke + rotate，无误）。

## 修改文件

- `apps/api/src/auth/auth.service.ts`（G1 时序安全比较、G2 防枚举）
- `apps/api/src/app.test.ts`（新增枚举回归用例）

## 验收

- [ ] `pnpm --filter qiyun-api typecheck` 0 错误
- [ ] `pnpm --filter qiyun-api test` 全绿（含新增枚举回归，无回归）
- [ ] G1：`resetPasswordWithCode` / `verifyEmailLoginCode` 验证码比较改用 `timingSafeEqual`
- [ ] G2：`/auth/password-reset/request` 对任意邮箱均返回成功态（不泄漏账号是否存在）
- [ ] G2：`/auth/password-reset/confirm` 对不存在账号返回与「验证码错误」相同的泛型错误

## 已知限制

- `timingSafeEqual` 修复的是应用层比较；真正的验证码暴力破解还依赖 `auth.code.verify` / `auth.password-reset.confirm` 的按 IP 限流（已具备）和 6 位码空间，本任务不改限流策略。
- 枚举修复为「响应一致」标准做法，依赖不返回账号存在性差异；不改变邮件是否实际投递。
