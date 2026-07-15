"use client";

import { PageHeader } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import {
  ConsolePage,
  ConsolePageAlerts,
  ConsolePageSection,
} from "@/components/console/console-page-shell";

import { PlatformWorkspacesPanel } from "./platform-workspaces-panel";

export function SuperAdminWorkspace() {
  return (
    <ConsolePage>
      <PageHeader
        title="超级管理员"
        description="审核官网试用申请、手工开通客户工作区，并查看已开通租户列表。"
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="超级管理员" />
      </ConsolePageAlerts>

      <ConsolePageSection>
        <PlatformWorkspacesPanel />
      </ConsolePageSection>
    </ConsolePage>
  );
}
