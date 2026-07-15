import type { CalendarEvent, CalendarEventKind, CalendarEventStatus } from "./types";

function at(year: number, month: number, day: number, hour: number, minute = 0): string {
  return new Date(year, month, day, hour, minute, 0, 0).toISOString();
}

interface Seed {
  id: string;
  title: string;
  /** 1-based day within the target month */
  day: number;
  /** 0 = 当前月，1 = 下个月 */
  monthOffset?: number;
  hour: number;
  durationMin: number;
  kind: CalendarEventKind;
  status: CalendarEventStatus;
  leadName?: string;
  ownerName?: string;
  note?: string;
}

const SEEDS: Seed[] = [
  { id: "evt-001", title: "回访：沈阳重工选型咨询", day: 2, hour: 10, durationMin: 30, kind: "follow_up", status: "done", leadName: "张伟", ownerName: "李娜" },
  { id: "evt-002", title: "产品演示：智能产线检测方案", day: 4, hour: 14, durationMin: 60, kind: "demo", status: "pending", leadName: "王芳", ownerName: "李娜", note: "准备 Demo 环境与样片" },
  { id: "evt-003", title: "商务会议：年度框架协议", day: 7, hour: 9, durationMin: 45, kind: "meeting", status: "pending", leadName: "陈强", ownerName: "赵磊" },
  { id: "evt-004", title: "电话跟进：报价说明", day: 9, hour: 16, durationMin: 15, kind: "call", status: "pending", leadName: "刘洋", ownerName: "李娜" },
  { id: "evt-005", title: "提醒：合同到期续约", day: 11, hour: 11, durationMin: 0, kind: "reminder", status: "pending", note: "沈阳重工年度服务合同今日到期" },
  { id: "evt-006", title: "回访：售后满意度", day: 13, hour: 15, durationMin: 30, kind: "follow_up", status: "pending", leadName: "孙丽", ownerName: "赵磊" },
  { id: "evt-007", title: "产品演示：视觉质检 POC", day: 16, hour: 10, durationMin: 60, kind: "demo", status: "pending", leadName: "周杰", ownerName: "李娜" },
  { id: "evt-008", title: "商务会议：渠道合作洽谈", day: 18, hour: 14, durationMin: 45, kind: "meeting", status: "pending", leadName: "吴敏", ownerName: "赵磊" },
  { id: "evt-009", title: "电话跟进：技术答疑", day: 21, hour: 17, durationMin: 15, kind: "call", status: "pending", leadName: "郑昊", ownerName: "李娜" },
  { id: "evt-010", title: "回访：二期需求收集", day: 23, hour: 11, durationMin: 30, kind: "follow_up", status: "pending", leadName: "冯雪", ownerName: "赵磊" },
  { id: "evt-011", title: "产品演示：边缘计算网关", day: 26, hour: 9, durationMin: 60, kind: "demo", status: "pending", leadName: "何静", ownerName: "李娜" },
  { id: "evt-012", title: "提醒：周报提交", day: 28, hour: 18, durationMin: 0, kind: "reminder", status: "pending", note: "本周跟进汇总发送至销售负责人" },
  { id: "evt-013", title: "商务会议：Q3 规划对齐", day: 3, monthOffset: 1, hour: 10, durationMin: 60, kind: "meeting", status: "pending", leadName: "陈强", ownerName: "赵磊" },
  { id: "evt-014", title: "回访：新签客户 onboarding", day: 6, monthOffset: 1, hour: 15, durationMin: 30, kind: "follow_up", status: "pending", leadName: "许涛", ownerName: "李娜" },
];

let cache: CalendarEvent[] | null = null;

function buildEvents(): CalendarEvent[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return SEEDS.map((seed) => {
    const m = month + (seed.monthOffset ?? 0);
    const start = at(year, m, seed.day, seed.hour, 0);
    const end = new Date(new Date(start).getTime() + seed.durationMin * 60_000).toISOString();
    return {
      id: seed.id,
      title: seed.title,
      start,
      end,
      kind: seed.kind,
      status: seed.status,
      leadName: seed.leadName,
      ownerName: seed.ownerName,
      note: seed.note,
    };
  });
}

function ensureCache(): CalendarEvent[] {
  if (!cache) cache = buildEvents();
  return cache;
}

export function filterEventsByRange(events: CalendarEvent[], from: string, to: string): CalendarEvent[] {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  return events.filter((evt) => {
    const s = new Date(evt.start).getTime();
    return s >= fromMs && s <= toMs;
  });
}

export function listCalendarEventsMock(from: string, to: string): CalendarEvent[] {
  return filterEventsByRange(ensureCache(), from, to);
}

export function listAllCalendarEventsMock(): CalendarEvent[] {
  return ensureCache();
}
