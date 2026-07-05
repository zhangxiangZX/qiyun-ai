import type { ReactNode } from "react";

const common = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
} as const;

const paths: Record<string, ReactNode> = {
  cloudBot: (
    <>
      <path
        d="M7 18.5h10.1A3.9 3.9 0 0 0 18 10.8 6.3 6.3 0 0 0 6.5 9.5 4.5 4.5 0 0 0 7 18.5Z"
        fill="currentColor"
      />
      <rect x="8" y="11" width="8" height="5" rx="2.2" fill="white" />
      <circle cx="10.7" cy="13.5" r=".8" fill="currentColor" />
      <circle cx="13.3" cy="13.5" r=".8" fill="currentColor" />
    </>
  ),
  chat: (
    <path
      d="M5.3 18.6 3.7 21l.4-4.1A7.8 7.8 0 0 1 3 13c0-4.4 4-8 9-8s9 3.6 9 8-4 8-9 8c-2.4 0-4.6-.8-6.7-2.4Z"
      fill="currentColor"
    />
  ),
  userPlus: (
    <>
      <circle cx="10" cy="8" r="3" fill="currentColor" />
      <path
        d="M4.5 19c.6-3 2.6-4.8 5.5-4.8 1.2 0 2.2.3 3.1.9M18 14v6m-3-3h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  badge: (
    <>
      <circle cx="12" cy="11" r="6" fill="currentColor" />
      <path
        d="m12 7.8 1 2.1 2.3.3-1.7 1.6.5 2.3-2.1-1.2-2.1 1.2.5-2.3-1.7-1.6 2.3-.3 1-2.1Z"
        fill="white"
      />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="m16 8 4-4M16 8h4v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="8" fill="currentColor" />
      <path
        d="M9.8 9.5a2.3 2.3 0 0 1 4.4.8c0 1.7-2.2 1.8-2.2 3.4m0 2.2h.01"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  robot: (
    <>
      <rect x="5" y="7" width="14" height="11" rx="4" fill="currentColor" />
      <rect x="7.5" y="10" width="9" height="5" rx="2" fill="white" />
      <circle cx="10" cy="12.5" r=".7" fill="currentColor" />
      <circle cx="14" cy="12.5" r=".7" fill="currentColor" />
      <path d="M12 7V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  book: (
    <>
      <path
        d="M5.5 4.5h10A2.5 2.5 0 0 1 18 7v12.5H8A2.5 2.5 0 0 0 5.5 22V4.5Z"
        fill="currentColor"
      />
      <path d="M9 8h5M9 12h5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  upload: (
    <path
      d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M5 16v3.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  bars: (
    <>
      <rect x="4" y="12" width="3" height="8" rx="1" fill="currentColor" />
      <rect x="10.5" y="7" width="3" height="13" rx="1" fill="currentColor" />
      <rect x="17" y="3" width="3" height="17" rx="1" fill="currentColor" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" fill="currentColor" />
      <circle cx="16.5" cy="10" r="2.4" fill="currentColor" />
      <path
        d="M3.8 19c.7-3 2.6-4.8 5.2-4.8 3.1 0 5.2 2 5.7 4.8M15 15.5c2.3.2 3.9 1.5 4.4 3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </>
  ),
  pulse: (
    <path
      d="M3 12h3l2-5 4 10 2-5h7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  settings: (
    <path
      d="M10.2 3.5h3.6l.5 2.1c.5.2 1 .5 1.5.8l2.1-.7 1.8 3.1-1.6 1.5c.1.5.1 1 .1 1.5s0 1-.1 1.5l1.6 1.5-1.8 3.1-2.1-.7c-.5.3-1 .6-1.5.8l-.5 2.1h-3.6l-.5-2.1c-.5-.2-1-.5-1.5-.8l-2.1.7-1.8-3.1 1.6-1.5a7 7 0 0 1 0-3L4.3 8.8l1.8-3.1 2.1.7c.5-.3 1-.6 1.5-.8l.5-2.1ZM12 15.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4Z"
      fill="currentColor"
    />
  ),
};

export function DashboardOverviewIcon({ name }: { name: string }) {
  return <svg {...common}>{paths[name] ?? paths.chat}</svg>;
}
