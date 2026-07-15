import { randomUUID } from "node:crypto";

import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventStatus,
} from "./calendar.types";

interface StoredEvent {
  workspaceId: string;
  event: CalendarEvent;
}

export interface CalendarRepository {
  list(workspaceId: string, from?: string, to?: string): Promise<CalendarEvent[]>;
  get(workspaceId: string, id: string): Promise<CalendarEvent | null>;
  create(workspaceId: string, input: CalendarEventInput): Promise<CalendarEvent>;
  update(
    workspaceId: string,
    id: string,
    patch: Partial<CalendarEventInput>,
  ): Promise<CalendarEvent | null>;
  remove(workspaceId: string, id: string): Promise<boolean>;
  count(workspaceId: string): Promise<number>;
  seedIfEmpty(workspaceId: string, events: CalendarEvent[]): Promise<void>;
}

function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return new Date(startA) <= new Date(endB) && new Date(endA) >= new Date(startB);
}

export class InMemoryCalendarRepository implements CalendarRepository {
  private readonly store = new Map<string, StoredEvent>();

  private key(workspaceId: string, id: string): string {
    return `${workspaceId}:${id}`;
  }

  async list(workspaceId: string, from?: string, to?: string): Promise<CalendarEvent[]> {
    const items = [...this.store.values()]
      .filter((entry) => entry.workspaceId === workspaceId)
      .map((entry) => entry.event)
      .sort((a, b) => a.start.localeCompare(b.start));

    if (!from && !to) {
      return items;
    }

    return items.filter((event) =>
      rangesOverlap(
        event.start,
        event.end,
        from ?? "0000-01-01T00:00:00.000Z",
        to ?? "9999-12-31T23:59:59.999Z",
      ),
    );
  }

  async get(workspaceId: string, id: string): Promise<CalendarEvent | null> {
    const entry = this.store.get(this.key(workspaceId, id));
    return entry && entry.workspaceId === workspaceId ? entry.event : null;
  }

  async create(workspaceId: string, input: CalendarEventInput): Promise<CalendarEvent> {
    const id = randomUUID();
    const event: CalendarEvent = {
      id,
      title: input.title,
      start: input.start,
      end: input.end,
      kind: input.kind,
      status: input.status ?? "pending",
      leadId: input.leadId,
      leadName: input.leadName,
      ownerName: input.ownerName,
      note: input.note,
    };
    this.store.set(this.key(workspaceId, id), { workspaceId, event });
    return event;
  }

  async update(
    workspaceId: string,
    id: string,
    patch: Partial<CalendarEventInput>,
  ): Promise<CalendarEvent | null> {
    const entry = this.store.get(this.key(workspaceId, id));
    if (!entry || entry.workspaceId !== workspaceId) {
      return null;
    }
    const updated: CalendarEvent = {
      ...entry.event,
      ...patch,
      id: entry.event.id,
    };
    this.store.set(this.key(workspaceId, id), { workspaceId, event: updated });
    return updated;
  }

  async remove(workspaceId: string, id: string): Promise<boolean> {
    const entry = this.store.get(this.key(workspaceId, id));
    if (!entry || entry.workspaceId !== workspaceId) {
      return false;
    }
    return this.store.delete(this.key(workspaceId, id));
  }

  async count(workspaceId: string): Promise<number> {
    let total = 0;
    for (const entry of this.store.values()) {
      if (entry.workspaceId === workspaceId) {
        total += 1;
      }
    }
    return total;
  }

  async seedIfEmpty(workspaceId: string, events: CalendarEvent[]): Promise<void> {
    if ((await this.count(workspaceId)) > 0) {
      return;
    }
    for (const event of events) {
      this.store.set(this.key(workspaceId, event.id), { workspaceId, event });
    }
  }
}

export type { CalendarEventStatus };
