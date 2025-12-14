"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

interface KPICardsProps {
  analytics: {
    shots?: {
      home: { total: number; onTarget: number; goals: number; conversionRate: number };
      away: { total: number; onTarget: number; goals: number; conversionRate: number };
    };
    possession?: { home: number; away: number };
    passAccuracy?: { home: number; away: number };
    progressivePasses?: { home: number; away: number };
    xa?: { home: number; away: number };
    xg?: { home: number; away: number };
    ppda?: { home: number; away: number };
    highRegains?: { home: number; away: number };
  } | null;
  homeTeamName: string;
  awayTeamName: string;
  matchDuration?: number; // Match duration in minutes for per-90 calculations
}

// Format helpers with guards
function formatPercentage(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(Number(value))) return "N/A";
  return `${Number(value).toFixed(decimals)}%`;
}

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return "N/A";
  return Math.round(Number(value)).toString();
}

function formatDecimal(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(Number(value))) return "N/A";
  return Number(value).toFixed(decimals);
}

export function KPICards({ analytics, homeTeamName, awayTeamName, matchDuration = 90 }: KPICardsProps) {
  const { t } = useTranslation();
  
  // Load persisted showPer90 from localStorage
  const loadShowPer90 = (): boolean => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem("kpiCards_showPer90");
      if (stored !== null) {
        return JSON.parse(stored) === true;
      }
    } catch (e) {
      console.warn("[KPICards] Failed to load showPer90:", e);
    }
    return false;
  };
  
  const [showPer90, setShowPer90] = useState<boolean>(loadShowPer90());
  
  // Save showPer90 to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("kpiCards_showPer90", JSON.stringify(showPer90));
    } catch (e) {
      console.warn("[KPICards] Failed to save showPer90:", e);
    }
  }, [showPer90]);
  
  // Helper to calculate per-90 values
  const per90 = (value: number | null | undefined): number => {
    if (value === null || value === undefined || isNaN(Number(value)) || matchDuration <= 0) return 0;
    return (Number(value) / matchDuration) * 90;
  };

  if (!analytics) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 shadow-lg">
            <p className="text-[10px] text-white/70 mb-2">Loading...</p>
            <p className="text-xl font-semibold text-white/50">—</p>
          </div>
        ))}
      </div>
    );
  }

  const kpiCards = [
    // Shots
    {
      label: t("totalShots") || "Total Shots",
      home: formatCount(analytics.shots?.home?.total),
      away: formatCount(analytics.shots?.away?.total),
      tooltip: t("totalShotsTooltip") || "Total number of shots attempted",
      color: "text-white",
    },
    {
      label: t("shotsOnTarget") || "Shots on Target",
      home: formatCount(analytics.shots?.home?.onTarget),
      away: formatCount(analytics.shots?.away?.onTarget),
      tooltip: t("shotsOnTargetTooltip") || "Shots that reached the goal",
      color: "text-white",
    },
    {
      label: t("goals") || "Goals",
      home: formatCount(analytics.shots?.home?.goals),
      away: formatCount(analytics.shots?.away?.goals),
      tooltip: t("goalsTooltip") || "Goals scored",
      color: "text-emerald-400",
    },
    {
      label: t("conversionRate") || "Conversion Rate",
      home: formatPercentage(analytics.shots?.home?.conversionRate),
      away: formatPercentage(analytics.shots?.away?.conversionRate),
      tooltip: t("conversionRateTooltip") || "Goals / Total Shots (explicit business rule)",
      color: "text-white",
    },
    // Possession
    {
      label: t("possession") || "Possession",
      home: formatPercentage(analytics.possession?.home),
      away: formatPercentage(analytics.possession?.away),
      tooltip: t("possessionTooltip") || "Time-weighted ball possession percentage (based on passes and touches, not shots)",
      color: "text-white",
    },
    // Passing
    {
      label: t("passAccuracy") || "Pass Accuracy",
      home: formatPercentage(analytics.passAccuracy?.home),
      away: formatPercentage(analytics.passAccuracy?.away),
      tooltip: t("passAccuracyTooltip") || "Percentage of successful passes",
      color: "text-white",
    },
    {
      label: t("progressivePasses") || "Progressive Passes",
      home: showPer90 
        ? formatDecimal(per90(analytics.progressivePasses?.home), 1)
        : formatCount(analytics.progressivePasses?.home),
      away: showPer90
        ? formatDecimal(per90(analytics.progressivePasses?.away), 1)
        : formatCount(analytics.progressivePasses?.away),
      tooltip: t("progressivePassesTooltip") || "Passes that move ball significantly forward (>20% distance reduction or >12m)",
      color: "text-white",
      showPer90: true,
    },
    // Advanced metrics
    {
      label: t("expectedAssistsXA") || "Expected Assists (xA)",
      home: formatDecimal(analytics.xa?.home),
      away: formatDecimal(analytics.xa?.away),
      tooltip: t("expectedAssistsXATooltip") || "Expected assists: xG value of shots created by passes",
      color: "text-emerald-400",
    },
    {
      label: "xG",
      home: formatDecimal(analytics.xg?.home),
      away: formatDecimal(analytics.xg?.away),
      tooltip: t("xGTooltip") || "Expected Goals: probability of scoring from shots",
      color: "text-emerald-400",
    },
    {
      label: t("pressingIntensityPPDA") || "PPDA",
      home: formatDecimal(analytics.ppda?.home, 1),
      away: formatDecimal(analytics.ppda?.away, 1),
      tooltip: t("pressingIntensityPPDATooltip") || "Passes Per Defensive Action: lower = more aggressive pressing",
      color: "text-white",
    },
    {
      label: t("highRegainsLabel") || "High Regains",
      home: showPer90
        ? formatDecimal(per90(analytics.highRegains?.home), 1)
        : formatCount(analytics.highRegains?.home),
      away: showPer90
        ? formatDecimal(per90(analytics.highRegains?.away), 1)
        : formatCount(analytics.highRegains?.away),
      tooltip: t("highRegainsTooltip") || "Ball recoveries in opponent's half (0-40m from goal)",
      color: "text-white",
      showPer90: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Per 90 Toggle */}
      <div className="flex items-center justify-end gap-2">
        <label className="flex items-center gap-2 text-[10px] text-white/70 cursor-pointer">
          <input
            type="checkbox"
            checked={showPer90}
            onChange={(e) => setShowPer90(e.target.checked)}
            className="h-3 w-3 rounded border-[#1a1f2e] bg-[#0b1220] text-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
          />
          <span>{t("showPer90") || "Show per 90'"}</span>
        </label>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, idx) => (
          <div
            key={idx}
            className="group relative rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 shadow-lg transition-all hover:border-[#1f2535]"
          >
            {/* Tooltip */}
            <div className="absolute -top-1 left-2 bg-[#0b1220] px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="text-[9px] text-white/90 max-w-xs">{kpi.tooltip}</div>
            </div>

            <p className="text-[10px] text-white/70 mb-2 flex items-center gap-1">
              {kpi.label}
              {kpi.showPer90 && showPer90 && (
                <span className="text-[9px] text-white/50">(per 90')</span>
              )}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-xl font-semibold ${kpi.color}`}>{kpi.home}</p>
                <p className="text-[9px] text-white/50 mt-0.5">{homeTeamName}</p>
              </div>
              <div className="text-[11px] text-white/30 mx-2">vs</div>
              <div className="flex-1 text-right">
                <p className={`text-xl font-semibold ${kpi.color}`}>{kpi.away}</p>
                <p className="text-[9px] text-white/50 mt-0.5">{awayTeamName}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

