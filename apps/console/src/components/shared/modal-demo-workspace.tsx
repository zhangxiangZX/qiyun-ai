"use client";

import { useState } from "react";

import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogConfirmActions,
} from "@qiyun/ui";
import { ConfirmDialog } from "@qiyun/ui";
import {
  UploadArea,
  ContactMethodGrid,
  CopyLinkContent,
} from "@qiyun/ui";
import {
  SuccessDialogToast,
  ToastProvider,
  useToast,
} from "@qiyun/ui";

import { Button } from "@qiyun/ui";
import { Input, Label, Select } from "@qiyun/ui";
import { PageHeader } from "@qiyun/ui";
import { ConsolePage } from "@/components/console/console-page-shell";

/* -------------------------------------------------------------------------- */
/*  Modal Demo Workspace – Visual showcase of ALL 36 弹框 designs             */
/*  Each section has a button to open its corresponding modal type            */
/* -------------------------------------------------------------------------- */

// ── Section: Confirm Dialogs (#18 停用, #22 发布确认, #23 停用确认) ─────────

function ConfirmDialogDemo() {
  const [dialog, setDialog] = useState<string | null>(null);

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        确认弹窗
      </h3>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setDialog("publish")}>
          发布确认（#22）
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDialog("disable")}>
          停用警告（#18）
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDialog("danger")}>
          危险操作（#23）
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDialog("reset-pwd")}>
          重置密码（#30）
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDialog("success-icon")}>
          带成功图标
        </Button>
      </div>

      {/* #22 发布确认 */}
      <ConfirmDialog
        open={dialog === "publish"}
        title="发布确认"
        description="确认后发布选型页，客户将可以看到该页面内容，确认发布？"
        confirmLabel="发布"
        cancelLabel="取消"
        icon="none"
        onConfirm={() => setDialog(null)}
        onCancel={() => setDialog(null)}
      />

      {/* #18 停用链接 - warning icon */}
      <ConfirmDialog
        open={dialog === "disable"}
        title="停用"
        description="确定要停用此销售链接吗？停用后将无法通过此链接获取线索。"
        confirmLabel="确认停用"
        icon="warning"
        onConfirm={() => setDialog(null)}
        onCancel={() => setDialog(null)}
      />

      {/* #23 停用确认 - danger/destructive */}
      <ConfirmDialog
        open={dialog === "danger"}
        title="停用确认"
        description="确定要停用此 AI 助手吗？停用后所有关联的嵌入代码将失效。"
        confirmLabel="确认停用"
        cancelLabel="取消"
        destructive
        icon="danger"
        onConfirm={() => setDialog(null)}
        onCancel={() => setDialog(null)}
      />

      {/* #30 重置密码 - warning */}
      <ConfirmDialog
        open={dialog === "reset-pwd"}
        title="重置密码"
        description="确定要重置该成员的登录密码吗？重置后需要发送新密码通知。"
        confirmLabel="确认重置"
        icon="warning"
        size="sm"
        onConfirm={() => setDialog(null)}
        onCancel={() => setDialog(null)}
      />

      {/* Success icon variant */}
      <ConfirmDialog
        open={dialog === "success-icon"}
        title="操作完成"
        description="资料已成功解析并关联到知识库。"
        confirmLabel="好的"
        icon="success"
        onConfirm={() => setDialog(null)}
        onCancel={() => setDialog(null)}
      />
    </section>
  );
}

// ── Section: Form Dialogs (#08 标记无效, #09 标记丢单, #10 转给同事) ────────

function FormDialogDemo() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"invalid" | "lost" | "transfer">("invalid");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [colleague, setColleague] = useState("");

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        表单弹窗
      </h3>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => { setMode("invalid"); setOpen(true); }}>
          标记无效（#08）
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setMode("lost"); setOpen(true); }}>
          标记丢单（#09）
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setMode("transfer"); setOpen(true); }}>
          转给同事（#10）
        </Button>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader>
          <DialogTitle>
            {mode === "invalid" ? "标记无效" : mode === "lost" ? "标记丢单" : "转给同事"}
          </DialogTitle>
          <DialogDescription>
            {mode === "invalid"
              ? "选择无效原因并填写备注信息"
              : mode === "lost"
                ? "选择丢单原因并填写备注信息"
                : "选择接收人并填写备注信息"}
          </DialogDescription>
        </DialogHeader>

        <DialogBody scrollable>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`reason-${mode}`}>
                {mode === "transfer" ? "选择接收人" : "选择原因"}
              </Label>
              <select
                id={`reason-${mode}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
              >
                <option value="">请选择</option>
                {mode === "invalid" && (
                  <>
                    <option value="not-interested">客户无需求</option>
                    <option value="wrong-target">目标客户不匹配</option>
                    <option value="duplicate">重复线索</option>
                  </>
                )}
                {mode === "lost" && (
                  <>
                    <option value="price">价格过高</option>
                    <option value="competitor">选择了竞品</option>
                    <option value="timing">暂时不需要</option>
                  </>
                )}
                {mode === "transfer" && (
                  <>
                    <option value="zhang-san">张三</option>
                    <option value="li-si">李四</option>
                    <option value="wang-wu">王五</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`note-${mode}`}>备注说明</Label>
              <textarea
                id={`note-${mode}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="请输入详细说明（选填）..."
                rows={3}
                className="flex min-h-[80px] w-full rounded-control border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogConfirmActions
            confirmLabel={
              mode === "invalid"
                ? "确认无效"
                : mode === "lost"
                  ? "确认丢单"
                  : "确认转入"
            }
            onCancel={() => setOpen(false)}
            onConfirm={() => setOpen(false)}
          />
        </DialogFooter>
      </Dialog>
    </section>
  );
}

// ── Section: Upload Dialog (#11 上传附件) ─────────────────────────────────────

function UploadDialogDemo() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        上传弹窗（#11）
      </h3>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        打开上传弹窗
      </Button>

      <Dialog open={open} onClose={() => { setOpen(false); setFiles(null); }} size="lg">
        <DialogHeader>
          <DialogTitle>上传附件</DialogTitle>
          <DialogDescription>支持批量上传文件作为线索附件</DialogDescription>
        </DialogHeader>

        <DialogBody>
          {!files || files.length === 0 ? (
            <UploadArea
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
              maxSizeHint="单文件最大 20MB，总计最大 50MB"
              formatHint="支持 PDF、Word、Excel、图片等常见格式"
              onFileSelect={(f) => setFiles(f)}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">已选择 {files.length} 个文件：</p>
              {Array.from(files).map((file, i) => (
                <div key={i} className="flex items-center gap-3 rounded-control bg-muted/50 p-3">
                  <span className="text-xs font-medium">{file.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiles(null)}
                className="mt-1"
              >
                重新选择
              </Button>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setFiles(null); }}>
            取消
          </Button>
          <Button
            disabled={!files || files.length === 0}
            loading={false}
            onClick={() => { setOpen(false); setFiles(null); }}
          >
            上传
          </Button>
        </DialogFooter>
      </Dialog>
    </section>
  );
}

// ── Section: Contact Grid (#12 联系客户) ────────────────────────────────────

function ContactDialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        联系客户（#12）
      </h3>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        打开联系客户
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader>
          <DialogTitle>联系客户</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <ContactMethodGrid
            phone="138****8888"
            wechat="wx_id_12345"
            email="client@company.com"
            wecom="企微待办"
            onPhoneClick={() => alert("拨打客户电话")}
            onWechatClick={() => alert("打开微信")}
            onEmailClick={() => alert("打开邮件客户端")}
            onWecomClick={() => alert("创建企微待办")}
          />

          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              我知道了
            </Button>
          </div>
        </DialogBody>
      </Dialog>
    </section>
  );
}

// ── Section: Copy Link (#20 复制链接) ────────────────────────────────────────

function CopyLinkDemo() {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        复制链接（#20）
      </h3>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        打开复制链接
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader>
          <DialogTitle>复制链接</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <CopyLinkContent
            url="https://select.qi-yun-ai.com/sales/TCS?ref=dashboard"
            onCancel={() => setOpen(false)}
          />
        </DialogBody>
      </Dialog>
    </section>
  );
}

// ── Section: Success Toast Dialog (#35 保存成功提示) ───────────────────────

function SuccessToastDemo() {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        成功提示（#35）
      </h3>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        显示成功提示
      </Button>

      <SuccessDialogToast
        open={open}
        title="保存成功"
        message="企业资料已成功保存！"
        confirmLabel="我知道了"
        onClose={() => setOpen(false)}
      />
    </section>
  );
}

// ── Section: Toast Notifications Stack (#36 系统状态提示) ──────────────────

function ToastStackDemoInner() {
  const toast = useToast();

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        通知堆栈（#36）
      </h3>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.addToast({
              variant: "success",
              title: "操作成功",
              description: "企业资料已成功保存！",
            })
          }
        >
          发送成功通知
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.addToast({
              variant: "warning",
              title: "存储空间不足",
              description: "当前存储使用率已达 85%，建议清理或升级套餐。",
              duration: 6000,
            })
          }
        >
          发送警告通知
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.addToast({
              variant: "error",
              title: "上传失败",
              description: "文件格式不支持，请上传 PDF、Word、Excel 或图片。",
              duration: 8000,
            })
          }
        >
          发送错误通知
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.addToast({
              variant: "info",
              title: "系统维护通知",
              description: "计划于本周六凌晨 02:00–04:00 进行系统升级。",
            })
          }
        >
          发送信息通知
        </Button>
      </div>
    </section>
  );
}

function ToastStackDemo() {
  // This component must be inside ToastProvider
  return <ToastStackDemoInner />;
}

// ════════════════════════════════════════════════════════════════════════════
//  Main Demo Workspace
// ════════════════════════════════════════════════════════════════════════════

export function ModalDemoWorkspace() {
  return (
    <ConsolePage>
      <PageHeader
        title="弹框样式系统"
        description="基于 36 个设计稿的统一弹框组件展示"
      />

      <div className="space-y-8 ui-stagger-fade-in">
        {/* Card 1: Confirm Dialogs */}
        <section className="rounded-card border border-border bg-card p-6 shadow-sm ui-hover-lift">
          <ConfirmDialogDemo />
        </section>

        {/* Card 2: Form Dialogs */}
        <section className="rounded-card border border-border bg-card p-6 shadow-sm ui-hover-lift">
          <FormDialogDemo />
        </section>

        {/* Card 3: Upload Dialog */}
        <section className="rounded-card border border-border bg-card p-6 shadow-sm ui-hover-lift">
          <UploadDialogDemo />
        </section>

        {/* Card 4: Contact Grid */}
        <section className="rounded-card border border-border bg-card p-6 shadow-sm ui-hover-lift">
          <ContactDialogDemo />
        </section>

        {/* Card 5: Copy Link */}
        <section className="rounded-card border border-border bg-card p-6 shadow-sm ui-hover-lift">
          <CopyLinkDemo />
        </section>

        {/* Card 6: Success Toast */}
        <section className="rounded-card border border-border bg-card p-6 shadow-sm ui-hover-lift">
          <SuccessToastDemo />
        </section>

        {/* Card 7: Toast Notifications (needs provider) */}
        <section className="rounded-card border border-border bg-card p-6 shadow-sm ui-hover-lift">
          <ToastProvider position="bottom-right" maxToasts={5}>
            <ToastStackDemo />
          </ToastProvider>
        </section>

        {/* Reference guide card */}
        <section className="rounded-card border border-dashed border-border bg-muted/30 p-6">
          <h3 className="mb-3 text-sm font-semibold text-card-foreground">
            组件使用指南
          </h3>
          <div className="grid gap-3 text-xs leading-relaxed text-muted-foreground md:grid-cols-2">
            <div>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
                &lt;Dialog&gt; + DialogHeader/Body/Footer
              </code>
              <p className="mt-1">通用弹框外壳，支持 sm/md/lg/xl 尺寸，ESC 关闭，点击遮罩关闭。</p>
            </div>
            <div>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
                &lt;ConfirmDialog icon=&quot;warning&quot;&gt;
              </code>
              <p className="mt-1">确认弹窗，支持 warning/danger/success/info 图标，destructive 变体。</p>
            </div>
            <div>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
                &lt;UploadArea&gt; / &lt;ContactMethodGrid&gt;
              </code>
              <p className="mt-1">表单内嵌组件：拖拽上传区、联系方式的 2×2 按钮网格。</p>
            </div>
            <div>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
                &lt;SuccessDialogToast&gt; / useToast()
              </code>
              <p className="mt-1">居中成功提示模态框、右下角自动消失的通知堆栈。</p>
            </div>
          </div>
        </section>
      </div>
    </ConsolePage>
  );
}
