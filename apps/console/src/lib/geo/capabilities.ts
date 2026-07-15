import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";

export interface GeoCapabilities {
  dataMode: "preview" | "upstream";
  /** Whether a real map provider (高德/腾讯/Mapbox) is wired via env key. */
  mapProvider: "none" | "amap" | "tencent" | "mapbox";
  note?: string;
}

export async function getGeoCapabilities(): Promise<GeoCapabilities> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    return {
      dataMode: "preview",
      mapProvider: "none",
      note:
        "预览模式使用省份经纬度散点图（无需地图 Key）。配置地图服务 Key 后可切换为真实地图（高德 / 腾讯 / Mapbox）。",
    };
  }
  return {
    dataMode: "upstream",
    // Provider resolution from env is a Codex/frontend concern; default none here.
    mapProvider: "none",
    note: "区域分布数据来自上游服务（apps/api GET /geo/distribution）。",
  };
}
