import type { RequestContext } from "../workspace";
import { ChannelsService } from "./channels.service";
import type { ChannelId, ChannelWithAccess } from "./channels.types";

export class ChannelsApi {
  constructor(private readonly service: ChannelsService) {}

  listChannels(context: RequestContext): Promise<ChannelWithAccess[]> {
    return this.service.listChannelsWithAccess(context.workspaceId);
  }

  requestChannelAccess(
    context: RequestContext,
    channelId: ChannelId,
  ): Promise<ChannelWithAccess> {
    return this.service.requestChannelAccess(context.workspaceId, channelId, context.userId ?? null);
  }
}
