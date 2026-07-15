"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Globe2,
  Map as MapIcon,
  MapPin,
  Sparkles,
  Target,
} from "lucide-react";

import { Skeleton } from "@qiyun/ui";

import { ConsoleModeBadge } from "@/components/console/console-data-mode-banner";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getGeoCapabilities } from "@/lib/geo/capabilities";
import type { GeoCapabilities } from "@/lib/geo/capabilities";
import { listRegions, summarizeRegions } from "@/lib/geo/data";
import { REGION_LEVEL_META } from "@/lib/geo/types";
import type { RegionPoint } from "@/lib/geo/types";
import { RegionScatter } from "@/components/geo/region-scatter";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import styles from "@/styles/geo.module.css";

type LoadState = "loading" | "ready" | "error";

export function GeoDistributionWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [listError, setListError] = useState<string | null>(null);
  const [regions, setRegions] = useState<RegionPoint[]>([]);
  const [center, setCenter] = useState<{ province: string; lng: number; lat: number } | undefined>(
    undefined,
  );
  const [capabilities, setCapabilities] = useState<GeoCapabilities | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    setListError(null);
    try {
      const [caps, data] = await Promise.all([getGeoCapabilities(), listRegions()]);
      setCapabilities(caps);
      setRegions(data.regions);
      setCenter(data.center);
      setLoadState("ready");
    } catch (error) {
      setListError(getApiErrorMessage(error, t(defaultLocale, "geo.error.load")));
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => summarizeRegions(regions), [regions]);
  const maxCount = useMemo(
    () => Math.max(1, ...regions.map((r) => r.count)),
    [regions],
  );
  const sorted = useMemo(
    () => [...regions].sort((a, b) => b.count - a.count),
    [regions],
  );

  if (loadState === "loading") {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>{t(defaultLocale, "geo.loading")}</p>
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <h1>{t(defaultLocale, "geo.title")}</h1>
          <p>{t(defaultLocale, "geo.description")}</p>
        </header>
        <ConsoleRequestError
          message={listError ?? t(defaultLocale, "geo.error.load")}
          onRetry={() => void load()}
          retryLabel={t(defaultLocale, "dashboard.error.retry")}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <div>
            <h1>{t(defaultLocale, "geo.title")}</h1>
            <p>{t(defaultLocale, "geo.description")}</p>
          </div>
          <span className={styles.previewBadge}>
            <Sparkles size={12} aria-hidden /> {t(defaultLocale, "geo.previewBadge")}
          </span>
        </div>
      </header>

      <div className={`${styles.kpiGrid} ui-stagger-fade-in ui-hover-lift-children`}>
        <article className={styles.kpiCard}>
          <div className={styles.kpiInner}>
            <div>
              <div className={styles.kpiLabel}>{t(defaultLocale, "geo.kpi.provinces")}</div>
              <div className={styles.kpiValue}>{summary.provinces}</div>
            </div>
            <div className={`${styles.kpiIcon} bg-[#3b5eff] text-white`}>
              <MapPin size={20} aria-hidden />
            </div>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiInner}>
            <div>
              <div className={styles.kpiLabel}>{t(defaultLocale, "geo.kpi.total")}</div>
              <div className={styles.kpiValue}>{summary.total}</div>
            </div>
            <div className={`${styles.kpiIcon} bg-[#0ea5e9] text-white`}>
              <Globe2 size={20} aria-hidden />
            </div>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiInner}>
            <div>
              <div className={styles.kpiLabel}>{t(defaultLocale, "geo.kpi.coreShare")}</div>
              <div className={styles.kpiValue}>{summary.coreShare}%</div>
            </div>
            <div className={`${styles.kpiIcon} bg-[#f97316] text-white`}>
              <Target size={20} aria-hidden />
            </div>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiInner}>
            <div>
              <div className={styles.kpiLabel}>{t(defaultLocale, "geo.kpi.untapped")}</div>
              <div className={styles.kpiValue}>{summary.untapped}</div>
            </div>
            <div className={`${styles.kpiIcon} bg-[#64748b] text-white`}>
              <MapIcon size={20} aria-hidden />
            </div>
          </div>
        </article>
      </div>

      <div className={styles.topActions}>
        <ConsoleModeBadge />
      </div>

      {capabilities?.note ? (
        <p className={styles.upstreamNote}>{capabilities.note}</p>
      ) : null}

      <div className={`${styles.gridMain} ui-stagger-fade-in ui-hover-lift-children`}>
        <article className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h2 className={styles.cardTitle}>{t(defaultLocale, "geo.rankTitle")}</h2>
          </div>
          <div className={styles.regionList}>
            {sorted.map((region) => {
              const meta = REGION_LEVEL_META[region.level];
              const width = `${Math.round((region.count / maxCount) * 100)}%`;
              return (
                <div key={region.province} className={styles.regionRow}>
                  <span className={styles.regionName}>{region.province}</span>
                  <span className={styles.regionBar}>
                    <span
                      className={styles.regionBarFill}
                      style={{ width, backgroundColor: meta.color }}
                    />
                  </span>
                  <span className={styles.regionCount}>{region.count}</span>
                </div>
              );
            })}
          </div>
        </article>

        <aside className={styles.scatterWrap}>
          <article className={styles.card}>
            <div className={styles.cardTitleRow}>
              <h2 className={styles.cardTitle}>{t(defaultLocale, "geo.mapTitle")}</h2>
            </div>
            <RegionScatter regions={regions} center={center} />
          </article>

          <article className={styles.card}>
            <div className={styles.cardTitleRow}>
              <h2 className={styles.cardTitle}>{t(defaultLocale, "geo.legendTitle")}</h2>
            </div>
            <div className={styles.legend}>
              {(Object.keys(REGION_LEVEL_META) as Array<keyof typeof REGION_LEVEL_META>).map(
                (key) => (
                  <span key={key} className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ backgroundColor: REGION_LEVEL_META[key].color }}
                    />
                    {REGION_LEVEL_META[key].label}
                  </span>
                ),
              )}
            </div>
          </article>
        </aside>
      </div>
    </div>
  );
}
