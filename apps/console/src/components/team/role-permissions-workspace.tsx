"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Loader2, Minus, Star, X } from "lucide-react";
import { Badge, Button, Input, PageHeader, Skeleton } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { useApiResource } from "@/lib/api/use-api-resource";
import type { WorkspaceMemberSummary } from "@/lib/auth/members";
import type { WorkspaceMemberRole } from "@/lib/team/role-types";
import {
  buildPlatformRoles,
  formatRoleUpdatedAt,
  getRolePermissions,
  listRoleMembers,
  mapToPermissionCodes,
  parsePermissionsToMap,
  type PermissionState,
  type RolePermissionMap,
} from "@/lib/team/roles-data";
import {
  MOCK_ROLES,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  ROLE_MEMBERS_PREVIEW,
  type PermissionAction,
} from "@/lib/team/roles-mock-data";
import { apiRequest } from "@/lib/api/client";
import { fetchAuthSession } from "@/lib/auth/client";
import { resolveActiveWorkspace } from "@/lib/auth/workspace-home";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "查看",
  create: "新增",
  edit: "编辑",
  delete: "删除",
  export: "导出",
  import: "导入",
  setup: "设置",
};

function PermissionCell({ state }: { state?: "full" | "partial" | "none" | "na" }) {
  if (state === "na" || !state) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (state === "full") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary text-white">
        <Check className="h-3 w-3" />
      </span>
    );
  }
  if (state === "partial") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded border-2 border-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
    );
  }
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-border" />;
}

const EMPTY_MEMBERS: WorkspaceMemberSummary[] = [];

const EMPTY_ROLE_PERMS: Array<{ role: string; permissions: string[] }> = [];

export function RolePermissionsWorkspace() {
  const {
    data: members,
    loading,
    error,
    isPreview,
    refetch,
  } = useApiResource("/auth/workspace-members", EMPTY_MEMBERS);

  useOnWorkspaceChanged(() => {
    refetch();
  });

  const { data: rolePerms, refetch: refetchRoles } = useApiResource("/roles", EMPTY_ROLE_PERMS);

  const [currentRole, setCurrentRole] = useState<WorkspaceMemberRole | null>(null);
  useEffect(() => {
    let active = true;
    fetchAuthSession()
      .then((session) => {
        if (!active || !session) return;
        const ws = resolveActiveWorkspace(session.workspaces, session.user.activeWorkspaceId);
        setCurrentRole((ws?.role ?? null) as WorkspaceMemberRole | null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const canEdit = currentRole === "owner" || currentRole === "admin";

  const [editing, setEditing] = useState(false);
  const [draftMap, setDraftMap] = useState<RolePermissionMap>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEdit = () => {
    setDraftMap(structuredClone(baseMap));
    setSaveError(null);
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };
  const toggleCell = (moduleId: string, action: PermissionAction) => {
    if (!editing) return;
    setDraftMap((prev) => {
      const moduleMap = { ...(prev[moduleId] ?? {}) };
      moduleMap[action] = moduleMap[action] === "full" ? "none" : "full";
      return { ...prev, [moduleId]: moduleMap };
    });
  };
  const toggleModuleAll = (moduleId: string) => {
    if (!editing) return;
    setDraftMap((prev) => {
      const moduleMap = { ...(prev[moduleId] ?? {}) };
      const allFull = PERMISSION_ACTIONS.every((action) => moduleMap[action] === "full");
      const next: Partial<Record<PermissionAction, PermissionState>> = {};
      for (const action of PERMISSION_ACTIONS) next[action] = allFull ? "none" : "full";
      return { ...prev, [moduleId]: next };
    });
  };
  const savePermissions = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const codes = mapToPermissionCodes(draftMap);
      await apiRequest(`/roles/${encodeURIComponent(selectedRoleIdStable)}/permissions`, {
        method: "PATCH",
        body: { permissions: codes },
      });
      await refetchRoles();
      setEditing(false);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "保存失败，请稍后重试";
      const isForbidden = /403|Manager|权限/.test(raw);
      const isPreview = /503|NOT_AVAILABLE|预览/.test(raw);
      setSaveError(
        isForbidden
          ? "仅企业所有者或管理员可编辑角色权限"
          : isPreview
            ? "当前为预览模式，无法保存。请连接后端后重试"
            : raw,
      );
    } finally {
      setSaving(false);
    }
  };

  const roles = useMemo(
    () => (isPreview ? MOCK_ROLES : buildPlatformRoles(members)),
    [isPreview, members],
  );

  const [selectedRoleId, setSelectedRoleId] = useState<WorkspaceMemberRole>("owner");
  const [mainTab, setMainTab] = useState<"roles" | "templates">("roles");
  const [permTab, setPermTab] = useState("功能权限");
  const [search, setSearch] = useState("");

  const selectedRoleIdStable = selectedRoleId as WorkspaceMemberRole;
  const storedPermissions = useMemo(
    () => rolePerms.find((item) => item.role === selectedRoleIdStable)?.permissions,
    [rolePerms, selectedRoleIdStable],
  );
  const baseMap = useMemo<RolePermissionMap>(
    () => parsePermissionsToMap(storedPermissions) ?? getRolePermissions(selectedRoleIdStable),
    [storedPermissions, selectedRoleIdStable],
  );
  const displayMap = editing ? draftMap : baseMap;

  const selectedRole =
    roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? MOCK_ROLES[0]!;
  const permissions = displayMap;
  const roleMembers = useMemo(() => {
    if (isPreview) return ROLE_MEMBERS_PREVIEW;
    return listRoleMembers(members, selectedRole.id as WorkspaceMemberRole);
  }, [isPreview, members, selectedRole.id]);

  const filteredRoles = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return roles;
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(keyword) ||
        role.code.toLowerCase().includes(keyword) ||
        role.description.toLowerCase().includes(keyword),
    );
  }, [roles, search]);

  const selectRole = (id: string) => {
    setSelectedRoleId(id as WorkspaceMemberRole);
  };

  if (loading) {
    return (
      <ConsolePage>
        <PageHeader title="角色权限" description="管理系统角色和权限，控制不同角色的功能访问和数据权限。" />
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="角色权限" />
        </ConsolePageAlerts>
        <div className="space-y-4 pb-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 xl:grid-cols-[240px_1fr_280px]">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </ConsolePage>
    );
  }

  if (error && !isPreview) {
    return (
      <ConsolePage>
        <PageHeader title="角色权限" description="管理系统角色和权限，控制不同角色的功能访问和数据权限。" />
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="角色权限" />
        </ConsolePageAlerts>
        <ConsoleRequestError message={String(error)} onRetry={refetch} />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <PageHeader
        title="角色权限"
        description="配置 V1 平台预置角色在各功能模块的访问权限。成员角色分配请在「邀请成员」页操作。"
        actions={
          <div className="flex items-center gap-2">
            {canEdit && !editing ? (
              <Button size="sm" onClick={startEdit}>
                编辑权限
              </Button>
            ) : null}
            {canEdit && editing ? (
              <>
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                  取消
                </Button>
                <Button size="sm" onClick={savePermissions} disabled={saving}>
                  {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  保存
                </Button>
              </>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/team">
                管理成员角色
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        }
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="角色权限" />
        {!isPreview ? (
          <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            V1 使用 owner / admin / member / viewer 四档预置角色。可在本页调整各角色的模块访问权限，保存后实时生效。
            {canEdit ? " 字段级权限与自定义角色将在后续版本开放。" : " 如需调整请联系企业所有者或管理员。"}
          </p>
        ) : null}
      </ConsolePageAlerts>

      <div className="pb-6">
        <div className="mb-4 flex gap-4 border-b border-border">
          {(["roles", "templates"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMainTab(tab)}
              className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                mainTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "roles" ? "角色管理" : "权限模板"}
            </button>
          ))}
        </div>

        {mainTab === "roles" ? (
          <div className="grid gap-4 xl:grid-cols-[240px_1fr_280px]">
            <aside className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border p-3">
                <Input
                  placeholder="搜索角色名称"
                  className="text-sm"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Button className="mt-2 w-full" size="sm" type="button" disabled title="V1 暂不支持自定义角色">
                  新建角色
                </Button>
              </div>
              <ul className="p-2">
                {filteredRoles.map((role) => (
                  <li key={role.id}>
                    <button
                      type="button"
                      onClick={() => selectRole(role.id)}
                      className={`flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        selectedRoleId === role.id ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
                        style={{ background: role.iconBg }}
                      >
                        {role.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{role.name}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{role.description}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{role.memberCount}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                共 {filteredRoles.length} 个角色
              </p>
            </aside>

            <section className="min-w-0 rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap gap-1 border-b border-border px-4 pt-3">
                {["功能权限", "数据权限", "字段权限", "高级设置"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPermTab(tab)}
                    disabled={tab !== "功能权限"}
                    className={`rounded-t-md px-3 py-2 text-sm ${
                      permTab === tab
                        ? "border border-b-0 border-border bg-card font-medium text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    } ${tab !== "功能权限" ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    {tab}
                    {tab !== "功能权限" ? (
                      <Badge variant="secondary" className="ml-1.5 text-[10px]">
                        即将上线
                      </Badge>
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="border-b border-border bg-blue-50/50 px-4 py-2 text-xs text-blue-700">
                {editing
                  ? "编辑模式：点击单元格开启或关闭对应权限，点击「全部」列可批量切换该模块。"
                  : "展示该角色在各功能模块的访问能力（与后端 RBAC 约定一致）。"}
              </div>
              <div className="overflow-x-auto p-2">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">功能模块</th>
                      <th className="px-2 py-2 text-center font-medium">全部</th>
                      {PERMISSION_ACTIONS.map((action) => (
                        <th key={action} className="px-2 py-2 text-center font-medium">
                          {ACTION_LABELS[action]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_MODULES.map((module) => {
                      const modulePerms = permissions[module.id];
                      return (
                        <Fragment key={module.id}>
                          <tr className="border-b border-border/50 bg-muted/20">
                            <td className="px-3 py-2 font-medium">{module.name}</td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                disabled={!editing}
                                onClick={() => toggleModuleAll(module.id)}
                                className={`inline-flex items-center justify-center rounded ${editing ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                                title={editing ? "切换该模块全部权限" : undefined}
                              >
                                <PermissionCell state={modulePerms?.view === "full" && modulePerms?.edit === "full" ? "full" : modulePerms?.view === "full" ? "partial" : "none"} />
                              </button>
                            </td>
                            {PERMISSION_ACTIONS.map((action) => {
                              const cellState = modulePerms?.[action] ?? "na";
                              const clickable = editing && cellState !== "na";
                              return (
                                <td key={action} className="px-2 py-2 text-center">
                                  <button
                                    type="button"
                                    disabled={!clickable}
                                    onClick={() => toggleCell(module.id, action)}
                                    className={`inline-flex items-center justify-center rounded ${clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                                    title={clickable ? "切换权限" : undefined}
                                  >
                                    <PermissionCell state={cellState} />
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                          {module.children?.map((child) => {
                            const childPerms = permissions[child.id] ?? modulePerms;
                            return (
                              <tr key={child.id} className="border-b border-border/30">
                                <td className="px-3 py-2 pl-8 text-muted-foreground">{child.name}</td>
                                <td className="px-2 py-2 text-center">
                                  <button
                                    type="button"
                                    disabled={!editing}
                                    onClick={() => toggleModuleAll(child.id)}
                                    className={`inline-flex items-center justify-center rounded ${editing ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                                    title={editing ? "切换该模块全部权限" : undefined}
                                  >
                                    <PermissionCell state={childPerms?.view === "full" ? "partial" : "none"} />
                                  </button>
                                </td>
                                {PERMISSION_ACTIONS.map((action) => {
                                  const cellState = childPerms?.[action] ?? "na";
                                  const clickable = editing && cellState !== "na";
                                  return (
                                    <td key={action} className="px-2 py-2 text-center">
                                      <button
                                        type="button"
                                        disabled={!clickable}
                                        onClick={() => toggleCell(child.id, action)}
                                        className={`inline-flex items-center justify-center rounded ${clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                                        title={clickable ? "切换权限" : undefined}
                                      >
                                        <PermissionCell state={cellState} />
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><PermissionCell state="full" /> 全部权限</span>
                <span className="flex items-center gap-1"><PermissionCell state="partial" /> 部分权限</span>
                <span className="flex items-center gap-1"><PermissionCell state="none" /> 无权限</span>
                <span className="flex items-center gap-1"><Minus className="h-3 w-3" /> 不适用</span>
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-3 font-semibold">角色信息</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="mb-1 block text-muted-foreground">角色名称</span>
                    <p className="font-medium">{selectedRole.name}</p>
                  </div>
                  <div>
                    <span className="mb-1 block text-muted-foreground">角色编码</span>
                    <p className="font-mono text-sm">{selectedRole.code}</p>
                  </div>
                  <div>
                    <span className="mb-1 block text-muted-foreground">角色描述</span>
                    <p className="text-muted-foreground">{selectedRole.description}</p>
                  </div>
                  <div>
                    <span className="mb-2 block text-muted-foreground">角色成员</span>
                    <div className="flex flex-wrap items-center gap-1">
                      {roleMembers.slice(0, 6).map((member, index) => (
                        <span
                          key={"userId" in member ? String(member.userId) : `${member.name}-${index}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
                          title={member.name}
                        >
                          {member.avatar}
                        </span>
                      ))}
                      <Link href="/dashboard/team" className="text-xs text-primary">
                        共 {selectedRole.memberCount} 人 &gt;
                      </Link>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    最近加入 {isPreview ? "2024-06-01" : formatRoleUpdatedAt(members, selectedRole.id as WorkspaceMemberRole)}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-3 font-semibold">如何调整成员角色</h3>
                <p className="text-sm text-muted-foreground">
                  在「邀请成员」页可修改成员为管理员、销售成员或只读访客。企业所有者仅可通过转移所有权变更。
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link href="/dashboard/team">前往成员管理</Link>
                </Button>
              </section>

              <section className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{editing ? "编辑中" : "权限说明"}</p>
                <p className="mt-2">
                  {editing
                    ? "修改后点击「保存」即时写入当前工作区。未保存的更改不会生效。"
                    : canEdit
                      ? "点击「编辑权限」可调整该角色的模块访问权限。"
                      : "权限由平台预置角色决定；如需调整请联系企业所有者或管理员。"}
                </p>
                {saveError ? (
                  <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{saveError}</p>
                ) : null}
              </section>
            </aside>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <Star className="mx-auto mb-3 h-10 w-10 text-amber-400" />
            <h3 className="font-semibold">权限模板库</h3>
            <p className="mt-2 text-sm text-muted-foreground">预置行业角色权限组合，一键应用到新建角色。</p>
            <Badge className="mt-4" variant="secondary">即将上线</Badge>
          </div>
        )}
      </div>
    </ConsolePage>
  );
}
