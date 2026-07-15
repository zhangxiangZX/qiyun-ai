import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
          borderRadius: "8px",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
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
    ),
    size,
  );
}
