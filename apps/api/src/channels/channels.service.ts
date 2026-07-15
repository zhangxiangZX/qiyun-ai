import { randomUUID } from "node:crypto";

import {
  CHANNEL_CATALOG,
  type ChannelAccessStatus,
  type ChannelId,
  type ChannelWithAccess,
} from "./channels.types";
import type { ChannelsRepository } from "./channels.repository";

/** 渠道接入业务错误（如未知渠道）。 */
export class ChannelsAccessError extends Error {}

export class ChannelsService {
  constructor(private readonly repo: ChannelsRepository) {}

  /**
   * 将静态渠道目录与该工作区已提交的接入申请状态合并，
   * 供前端一站式渲染「目录 + 当前申请状态」。
   */
  async listChannelsWithAccess(workspaceId: string): Promise<ChannelWithAccess[]> {
    const requests = await this.repo.listChannelAccessRequests(workspaceId);
    const statusByChannel = new Map<ChannelId, ChannelAccessStatus>();
    for (const req of requests) {
      statusByChannel.set(req.channelId, req.status);
    }
    return CHANNEL_CATALOG.map((item) => ({
      ...item,
      accessStatus: statusByChannel.get(item.id) ?? null,
    }));
  }

  /**
   * 提交某渠道的接入申请。幂等：
   * - 已 approved：直接返回，不重复写。
   * - 已 requested / rejected：重新提交为 requested（刷新申请时间）。
   */
  async requestChannelAccess(
    workspaceId: string,
    channelId: ChannelId,
    requestedBy: string | null,
  ): Promise<ChannelWithAccess> {
    const catalogItem = CHANNEL_CATALOG.find((c) => c.id === channelId);
    if (!catalogItem) throw new ChannelsAccessError(`Unknown channel: ${channelId}`);

    const existing = await this.repo.findChannelAccessRequest(workspaceId, channelId);
    if (existing && existing.status === "approved") {
      return { ...catalogItem, accessStatus: existing.status };
    }

    const record = await this.repo.upsertChannelAccessRequest({
      id: `ca_${randomUUID()}`,
      workspaceId,
      channelId,
      status: "requested",
      requestedBy,
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewNote: null,
    });
    return { ...catalogItem, accessStatus: record.status };
  }
}
