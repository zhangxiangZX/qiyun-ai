export type CalendarEventKind = "follow_up" | "demo" | "meeting" | "call" | "reminder";

export type CalendarEventStatus = "pending" | "done" | "cancelled";

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO datetime (local) */
  start: string;
  /** ISO datetime (local) */
  end: string;
  kind: CalendarEventKind;
  status: CalendarEventStatus;
  leadId?: string;
  leadName?: string;
  ownerName?: string;
  note?: string;
}

export type CalendarViewMode = "month" | "upcoming";

export interface CalendarCapabilities {
  dataMode: "preview" | "upstream";
  canReadEvents: boolean;
  upstreamNote?: string;
}
