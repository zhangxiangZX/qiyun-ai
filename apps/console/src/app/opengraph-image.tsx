import { ImageResponse } from "next/og";

export const alt = "AI云 · 工业官网获客系统";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#2563eb",
            borderRadius: 24,
            marginBottom: 40,
          }}
        >
          <svg width="64" height="64" viewBox="0 0 100 100" fill="none">
            <path
              d="M75 65c11.046 0 20-8.954 20-20 0-10.015-7.39-18.31-17-19.744C76.31 14.668 64.03 5 50 5 34.536 5 21.74 15.422 18.234 29.844 8.066 32.194 0 41.286 0 52c0 11.046 8.954 20 20 20h55z"
              fill="white"
            />
            <rect x="32" y="40" width="8" height="14" rx="4" fill="#2563eb" />
            <rect x="52" y="40" width="8" height="14" rx="4" fill="#2563eb" />
            <path
              d="M30 70c5 10 40 10 45 0"
              stroke="#2563eb"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            marginBottom: 16,
            lineHeight: 1.1,
          }}
        >
          AI云
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#93c5fd",
            lineHeight: 1.4,
          }}
        >
          工业官网获客系统 · AI 接待 · 留资 · 线索跟进
        </div>
      </div>
    ),
    size,
  );
}
