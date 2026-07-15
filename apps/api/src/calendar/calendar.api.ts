import { randomUUID } from "node:crypto";

import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventKind,
} from "./calendar.types";
import type { CalendarRepository } from "./calendar.repository";

function shiftDays(base: Date, days: number, hour: number, minute = 0): string {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function buildDemoEvents(workspaceId: string, now: Date): CalendarEvent[] {
  const samples: Array<{
    title: string;
    dayOffset: number;
    hour: number;
    kind: CalendarEventKind;
    status: CalendarEvent["status"];
    leadName?: string;
    ownerName?: string;
    note?: string;
  }> = [
    {
      title: "回访：昆山精密机械询盘",
      dayOffset: -2,
      hour: 10,
      kind: "follow_up",
      status: "done",
      leadName: "昆山精密机械",
      ownerName: "王磊",
      note: "已发送产品手册，等待技术确认。",
    },
    {
      title: "线上演示：汽车零部件客户",
      dayOffset: 1,
      hour: 14,
      kind: "demo",
      status: "pending",
      leadName: "长春汽车零部件",
      ownerName: "李娜",
      note: "演示私有化部署方案。",
    },
    {
      title: "报价评审会",
      dayOffset: 3,
      hour: 15,
      kind: "meeting",
      status: "pending",
      ownerName: "李娜",
    },
    {
      title: "电话跟进：华南代理商",
      dayOffset: 5,
      hour: 11,
      kind: "call",
      status: "pending",
      leadName: "华南代理商",
      ownerName: "王磊",
    },
    {
      title: "合同到期提醒：华东制造",
      dayOffset: 8,
      hour: 9,
      kind: "reminder",
      status: "pending",
      leadName: "华东制造",
      ownerName: "李娜",
    },
  ];

  return samples.map((sample) => {
    const start = shiftDays(now, sample.dayOffset, sample.hour);
    const end = shiftDays(now, sample.dayOffset, sample.hour + 1);
    return {
      id: randomUUID(),
      title: sample.title,
      start,
      end,
      kind: sample.kind,
      status: sample.status,
      leadName: sample.leadName,
      ownerName: sample.ownerName,
      note: sample.note,
    } satisfies CalendarEvent;
  });
}

export class CalendarApi {
  constructor(private readonly repository: CalendarRepository) {}

  async listEvents(
    workspaceId: string,
    from?: string,
    to?: string,
  ): Promise<CalendarEvent[]> {
    if ((await this.repository.count(workspaceId)) === 0) {
      await this.repository.seedIfEmpty(
        workspaceId,
        buildDemoEvents(workspaceId, new Date()),
      );
    }
    return this.repository.list(workspaceId, from, to);
  }

  async getEvent(workspaceId: string, id: string): Promise<CalendarEvent | null> {
    return this.repository.get(workspaceId, id);
  }

  async createEvent(workspaceId: string, input: CalendarEventInput): Promise<CalendarEvent> {
    return this.repository.create(workspaceId, input);
  }

  async updateEvent(
    workspaceId: string,
    id: string,
    patch: Partial<CalendarEventInput>,
  ): Promise<CalendarEvent | null> {
    return this.repository.update(workspaceId, id, patch);
  }

  async deleteEvent(workspaceId: string, id: string): Promise<boolean> {
    return this.repository.remove(workspaceId, id);
  }
}
