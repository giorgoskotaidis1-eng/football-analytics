"use client";

import { useMemo } from "react";
import { useTranslation } from "@/lib/i18n";

interface Event {
  id: number;
  type: string;
  team: string;
  x: number;
  y: number;
  minute: number;
  xg: number;
  playerId: number | null;
  metadata: string;
}

interface Player {
  id: number;
  name: string;
}

interface Analytics {
  ppda?: { home?: number; away?: number } | number;
  possession?: { home: number; away: number } | number;
  xg?: { home: number; away: number } | number;
  shots?: { home?: any; away?: any } | number;
  passes?: number;
  highRegains?: { home?: number; away?: number } | number;
  progressivePasses?: { home?: number; away?: number } | number;
  passAccuracy?: { home?: number; away?: number } | number;
  shotConversionRate?: { home?: number; away?: number } | number;
}

interface AnalysisNotesProps {
  events: Event[];
  players: Player[];
  analytics: Analytics;
  homeTeamName: string;
  awayTeamName: string;
}

export function AnalysisNotes({ events, players, analytics, homeTeamName, awayTeamName }: AnalysisNotesProps) {
  const { t } = useTranslation();

  // Helper to get numeric value from analytics (handles both object and number)
  const getValue = (value: any, key: 'home' | 'away' = 'home'): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      return typeof value[key] === 'number' ? value[key] : 0;
    }
    return 0;
  };

  // Calculate tactical insights from data
  const tacticalObservations = useMemo(() => {
    if (!analytics) return [];
    
    const observations: string[] = [];
    
    const ppda = getValue(analytics?.ppda);
    if (ppda > 0 && ppda < 8) {
      observations.push(t("teamXAggressivePressing"));
    }
    
    const possession = getValue(analytics?.possession);
    if (possession > 60) {
      observations.push(t("teamYDominatedPossession"));
    }
    
    const xg = getValue(analytics?.xg);
    if (xg > 2.0) {
      observations.push(t("teamXCreatedHighQualityChances"));
    }
    
    if (events.length > 50) {
      observations.push(t("matchIntensityIncreased"));
    }
    
    return observations;
  }, [analytics, events, t]);

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
      <h3 className="text-sm font-bold text-white">{t("analysisNotes")}</h3>
      
      {tacticalObservations.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300">{t("tacticalObservationsSummary")}</p>
          <ul className="space-y-1 text-[11px] text-slate-400">
            {tacticalObservations.map((obs, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">{t("noAnalysisNotesYet")}</p>
      )}

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
        <div>
          <p className="text-xs font-semibold text-slate-300 mb-2">{t("keyStatistics")}</p>
          <div className="space-y-1 text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>{t("totalShots")}:</span>
              <span className="text-white">
                {(() => {
                  if (!analytics) return 0;
                  const shots = analytics.shots;
                  if (typeof shots === 'number') return shots;
                  if (shots && typeof shots === 'object') {
                    const homeShots = shots.home?.total || 0;
                    const awayShots = shots.away?.total || 0;
                    return homeShots + awayShots;
                  }
                  return 0;
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t("totalPasses")}:</span>
              <span className="text-white">{analytics?.passes || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("possessionPercentage")}:</span>
              <span className="text-white">{getValue(analytics?.possession).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>{t("expectedGoals")}:</span>
              <span className="text-white">{getValue(analytics?.xg).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-300 mb-2">{t("advancedMetrics")}</p>
          <div className="space-y-1 text-[11px] text-slate-400">
            {analytics && getValue(analytics.highRegains) > 0 && (
              <div className="flex justify-between">
                <span>{t("highRegains")}:</span>
                <span className="text-white">{getValue(analytics.highRegains)}</span>
              </div>
            )}
            {analytics && getValue(analytics.progressivePasses) > 0 && (
              <div className="flex justify-between">
                <span>{t("progressivePasses")}:</span>
                <span className="text-white">{getValue(analytics.progressivePasses)}</span>
              </div>
            )}
            {analytics && getValue(analytics.passAccuracy) > 0 && (
              <div className="flex justify-between">
                <span>{t("passAccuracy")}:</span>
                <span className="text-white">{getValue(analytics.passAccuracy).toFixed(1)}%</span>
              </div>
            )}
            {analytics && (() => {
              const shots = analytics.shots;
              if (shots && typeof shots === 'object' && shots.home?.conversionRate !== undefined) {
                return (
                  <div className="flex justify-between">
                    <span>{t("shotConversionRate")}:</span>
                    <span className="text-white">{shots.home.conversionRate.toFixed(1)}%</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      {tacticalObservations.length === 0 && (
        <p className="text-[10px] text-slate-500 pt-2">{t("addEventsToGenerateInsights")}</p>
      )}
    </div>
  );
}
