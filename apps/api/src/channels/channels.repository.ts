import type {
  ChannelAccessRequest,
  ChannelId,
} from "./channels.types";

export interface ChannelsRepository {
  listChannelAccessRequests(workspaceId: string): Promise<ChannelAccessRequest[]>;
  findChannelAccessRequest(
    workspaceId: string,
    channelId: ChannelId,
  ): Promise<ChannelAccessRequest | null>;
  upsertChannelAccessRequest(record: ChannelAccessRequest): Promise<ChannelAccessRequest>;
}

export class InMemoryChannelsRepository implements ChannelsRepository {
  private readonly items = new Map<string, ChannelAccessRequest>();

  private key(workspaceId: string, channelId: ChannelId): string {
    return `${workspaceId}:${channelId}`;
  }

  async listChannelAccessRequests(workspaceId: string): Promise<ChannelAccessRequest[]> {
    return [...this.items.values()].filter((item) => item.workspaceId === workspaceId);
  }

  async findChannelAccessRequest(
    workspaceId: string,
    channelId: ChannelId,
  ): Promise<ChannelAccessRequest | null> {
    return this.items.get(this.key(workspaceId, channelId)) ?? null;
  }

  async upsertChannelAccessRequest(record: ChannelAccessRequest): Promise<ChannelAccessRequest> {
    this.items.set(this.key(record.workspaceId, record.channelId), record);
    return record;
  }
}
