import type { RegionLevel, RegionPoint, RegionDistributionResult } from "./geo.types";

interface Seed {
  province: string;
  lng: number;
  lat: number;
  count: number;
  level: RegionLevel;
}

/**
 * Approximate provincial-capital coordinates (lng/lat) plus a sample lead
 * distribution. In a live deployment this is derived from the leads table;
 * the memory driver returns this curated snapshot so the map renders without
 * a database.
 */
const SEEDS: Seed[] = [
  { province: "辽宁", lng: 123.43, lat: 41.8, count: 86, level: "core" },
  { province: "广东", lng: 113.26, lat: 23.13, count: 142, level: "core" },
  { province: "江苏", lng: 118.78, lat: 32.06, count: 118, level: "core" },
  { province: "浙江", lng: 120.15, lat: 30.27, count: 97, level: "core" },
  { province: "山东", lng: 117.0, lat: 36.65, count: 73, level: "active" },
  { province: "上海", lng: 121.47, lat: 31.23, count: 64, level: "active" },
  { province: "北京", lng: 116.4, lat: 39.9, count: 58, level: "active" },
  { province: "河北", lng: 114.5, lat: 38.04, count: 41, level: "active" },
  { province: "四川", lng: 104.07, lat: 30.67, count: 52, level: "active" },
  { province: "湖北", lng: 114.3, lat: 30.6, count: 38, level: "emerging" },
  { province: "福建", lng: 119.3, lat: 26.08, count: 44, level: "emerging" },
  { province: "河南", lng: 113.65, lat: 34.76, count: 47, level: "emerging" },
  { province: "湖南", lng: 112.94, lat: 28.23, count: 29, level: "emerging" },
  { province: "安徽", lng: 117.28, lat: 31.86, count: 33, level: "emerging" },
  { province: "陕西", lng: 108.95, lat: 34.27, count: 22, level: "emerging" },
  { province: "重庆", lng: 106.55, lat: 29.56, count: 26, level: "emerging" },
  { province: "天津", lng: 117.2, lat: 39.13, count: 18, level: "emerging" },
  { province: "江西", lng: 115.89, lat: 28.68, count: 15, level: "untapped" },
  { province: "云南", lng: 102.71, lat: 25.04, count: 12, level: "untapped" },
  { province: "广西", lng: 108.32, lat: 22.82, count: 19, level: "untapped" },
  { province: "山西", lng: 112.55, lat: 37.87, count: 14, level: "untapped" },
  { province: "贵州", lng: 106.71, lat: 26.65, count: 9, level: "untapped" },
];

const CENTER: { province: string; lng: number; lat: number } = {
  province: "辽宁",
  lng: 123.43,
  lat: 41.8,
};

export class GeoApi {
  getDistribution(): RegionDistributionResult {
    const regions: RegionPoint[] = SEEDS.map((seed) => ({
      province: seed.province,
      lng: seed.lng,
      lat: seed.lat,
      count: seed.count,
      level: seed.level,
    })).sort((a, b) => b.count - a.count);

    return { regions, center: CENTER };
  }
}
