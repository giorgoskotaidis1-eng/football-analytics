"use client";

import { useState, useEffect } from "react";
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
            <p className="text-[10px] text-white/70 mb-2">Φόρτωση...</p>
            <p className="text-xl font-semibold text-white/50">—</p>
          </div>
        ))}
      </div>
    );
  }

  // Icon component helper
  const MetricIcon = ({ iconType }: { iconType: string }) => {
    const icons: Record<string, JSX.Element> = {
      shots: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      target: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      goal: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      conversion: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      possession: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      pass: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      ),
      progressive: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      assist: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      xg: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      pressing: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      regain: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    };
    return icons[iconType] || null;
  };

  const kpiCards = [
    // Shots
    {
      label: t("totalShots") || "Συνολικά Σουτ",
      home: formatCount(analytics.shots?.home?.total),
      away: formatCount(analytics.shots?.away?.total),
      tooltip: t("totalShotsTooltip") || "Συνολικός αριθμός σουτ",
      color: "text-white",
      icon: "shots",
    },
    {
      label: t("shotsOnTarget") || "Σουτ στο Τέρμα",
      home: formatCount(analytics.shots?.home?.onTarget),
      away: formatCount(analytics.shots?.away?.onTarget),
      tooltip: t("shotsOnTargetTooltip") || "Σουτ που έφτασαν στο τέρμα",
      color: "text-white",
      icon: "target",
    },
    {
      label: t("goals") || "Γκολ",
      home: formatCount(analytics.shots?.home?.goals),
      away: formatCount(analytics.shots?.away?.goals),
      tooltip: t("goalsTooltip") || "Γκολ που σημειώθηκαν",
      color: "text-emerald-400",
      icon: "goal",
    },
    {
      label: t("conversionRate") || "Ποσοστό Μετατροπής",
      home: formatPercentage(analytics.shots?.home?.conversionRate),
      away: formatPercentage(analytics.shots?.away?.conversionRate),
      tooltip: t("conversionRateTooltip") || "Γκολ / Συνολικά Σουτ",
      color: "text-white",
      icon: "conversion",
    },
    // Possession
    {
      label: t("possession") || "Κατοχή",
      home: formatPercentage(analytics.possession?.home),
      away: formatPercentage(analytics.possession?.away),
      tooltip: t("possessionTooltip") || "Ποσοστό κατοχής μπάλας",
      color: "text-white",
      icon: "possession",
    },
    // Passing
    {
      label: t("passAccuracy") || "Ακρίβεια Πάσας",
      home: formatPercentage(analytics.passAccuracy?.home),
      away: formatPercentage(analytics.passAccuracy?.away),
      tooltip: t("passAccuracyTooltip") || "Ποσοστό επιτυχημένων πασών",
      color: "text-white",
      icon: "pass",
    },
    {
      label: t("progressivePasses") || "Προοδευτικές Πάσες",
      home: showPer90 
        ? formatDecimal(per90(analytics.progressivePasses?.home), 1)
        : formatCount(analytics.progressivePasses?.home),
      away: showPer90
        ? formatDecimal(per90(analytics.progressivePasses?.away), 1)
        : formatCount(analytics.progressivePasses?.away),
      tooltip: t("progressivePassesTooltip") || "Πάσες που προωθούν σημαντικά τη μπάλα μπροστά",
      color: "text-white",
      showPer90: true,
      icon: "progressive",
    },
    // Advanced metrics
    {
      label: t("expectedAssistsXA") || "Αναμενόμενες Ασίστ (xA)",
      home: formatDecimal(analytics.xa?.home),
      away: formatDecimal(analytics.xa?.away),
      tooltip: t("expectedAssistsXATooltip") || "Αναμενόμενες ασίστ: xG αξία σουτ που δημιουργήθηκαν από πάσες",
      color: "text-emerald-400",
      icon: "assist",
    },
    {
      label: "xG",
      home: formatDecimal(analytics.xg?.home),
      away: formatDecimal(analytics.xg?.away),
      tooltip: t("xGTooltip") || "Αναμενόμενα Γκολ: πιθανότητα σκοραρίσματος από σουτ",
      color: "text-emerald-400",
      icon: "xg",
    },
    {
      label: t("pressingIntensityPPDA") || "Ένταση Pressing (PPDA)",
      home: formatDecimal(analytics.ppda?.home, 1),
      away: formatDecimal(analytics.ppda?.away, 1),
      tooltip: t("pressingIntensityPPDATooltip") || "Πάσες ανά Αμυντική Δράση: χαμηλότερο = πιο επιθετικό pressing",
      color: "text-white",
      icon: "pressing",
    },
    {
      label: t("highRegainsLabel") || "Υψηλές Ανάκτησεις (0-40m)",
      home: showPer90
        ? formatDecimal(per90(analytics.highRegains?.home), 1)
        : formatCount(analytics.highRegains?.home),
      away: showPer90
        ? formatDecimal(per90(analytics.highRegains?.away), 1)
        : formatCount(analytics.highRegains?.away),
      tooltip: t("highRegainsTooltip") || "Ανάκτηση μπάλας στο μισό του αντιπάλου (0-40m από το τέρμα)",
      color: "text-white",
      showPer90: true,
      icon: "regain",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
            <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Κλειδί Μετρικές</h3>
            <p className="text-[10px] text-white/60">Συνοπτική ανάλυση των βασικών στατιστικών</p>
          </div>
        </div>
        {/* Per 90 Toggle */}
        <label className="flex items-center gap-2 rounded-lg border border-[#1a1f2e] bg-[#0b1220] px-3 py-1.5 text-[10px] text-white/70 cursor-pointer hover:bg-[#1a1f2e] transition-colors">
          <input
            type="checkbox"
            checked={showPer90}
            onChange={(e) => setShowPer90(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[#1a1f2e] bg-[#0b1220] text-emerald-500 focus:ring-2 focus:ring-emerald-500/60"
          />
          <span className="font-medium">{t("showPer90") || "Εμφάνιση ανά 90'"}</span>
        </label>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, idx) => (
          <div
            key={idx}
            className="group relative rounded-xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] to-[#0f1620] p-5 shadow-lg transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/10 hover:shadow-xl"
          >
            {/* Tooltip */}
            <div className="absolute -top-2 left-3 bg-[#0b1220] border border-emerald-500/30 rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
              <div className="text-[9px] text-white/90 max-w-xs font-medium">{kpi.tooltip}</div>
            </div>

            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
                <MetricIcon iconType={kpi.icon} />
              </span>
              <p className="text-[10px] font-semibold text-white/90 flex-1 flex items-center gap-1.5">
                <span>{kpi.label}</span>
                {kpi.showPer90 && showPer90 && (
                  <span className="text-[9px] text-emerald-400/80 font-medium bg-emerald-500/15 px-1.5 py-0.5 rounded">(ανά 90')</span>
                )}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-2xl font-bold ${kpi.color} mb-1`}>{kpi.home}</p>
                <p className="text-[9px] text-white/60 font-medium">{homeTeamName}</p>
              </div>
              <div className="text-[11px] text-white/40 mx-3 font-semibold">vs</div>
              <div className="flex-1 text-right">
                <p className={`text-2xl font-bold ${kpi.color} mb-1`}>{kpi.away}</p>
                <p className="text-[9px] text-white/60 font-medium">{awayTeamName}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

