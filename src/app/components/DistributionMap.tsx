"use client";

interface Event {
  id: number;
  type: string;
  team: string;
  x: number | null;
  y: number | null;
}

interface DistributionMapProps {
  events: Event[];
  team: "home" | "away";
  teamName: string;
}

export function DistributionMap({ events, team, teamName }: DistributionMapProps) {
  // Define zones: Self box, Def third, Middle, Att third, Opp box
  const zones = [
    { name: "Δική περιοχή", xRange: [0, 20], yRange: [0, 100] },
    { name: "Αμυντικό τρίτο", xRange: [20, 40], yRange: [0, 100] },
    { name: "Κέντρο", xRange: [40, 60], yRange: [0, 100] },
    { name: "Επιθετικό τρίτο", xRange: [60, 80], yRange: [0, 100] },
    { name: "Αντίπαλος περιοχή", xRange: [80, 100], yRange: [0, 100] },
  ];

  // Calculate events per zone with guards
  const zoneStats = zones.map((zone) => {
    const zoneEvents = events.filter(
      (e) =>
        e &&
        e.team === team &&
        e.x !== null &&
        e.y !== null &&
        !isNaN(Number(e.x)) &&
        !isNaN(Number(e.y)) &&
        Number(e.x) >= zone.xRange[0] &&
        Number(e.x) < zone.xRange[1] &&
        Number(e.y) >= zone.yRange[0] &&
        Number(e.y) <= zone.yRange[1]
    );

    const passes = zoneEvents.filter((e) => e.type === "pass").length;
    const shots = zoneEvents.filter((e) => e.type === "shot").length;
    const touches = zoneEvents.filter((e) => e.type === "touch").length;

    return {
      name: zone.name,
      total: Number(zoneEvents.length) || 0,
      passes: Number(passes) || 0,
      shots: Number(shots) || 0,
      touches: Number(touches) || 0,
    };
  });

  const maxTotal = Math.max(...zoneStats.map((z) => z.total), 1);
  
  // Check if we have any data
  const hasData = zoneStats.some((z) => z.total > 0);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 shadow-lg">
        <p className="mb-3 text-[10px] font-medium text-white/80">{teamName} - Passing volume by zone</p>
        <div className="flex h-48 items-center justify-center text-[11px] text-white/50">
          Χωρίς δεδομένα
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 shadow-lg">
        <p className="mb-3 text-[10px] font-medium text-white/80">{teamName} - Passing volume by zone</p>
        <div className="flex h-48 gap-px rounded-md bg-[#1a1f2e]">
          {zoneStats.map((zone, idx) => {
            const heightPercent = (zone.total / maxTotal) * 100;
            return (
              <div
                key={idx}
                className="relative flex flex-1 flex-col items-center justify-end border border-[#1a1f2e] bg-gradient-to-t from-emerald-500/20 to-[#1a1f2e]/10 px-2 py-3 text-center"
              >
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-500/80 via-emerald-500/60 to-emerald-500/40 transition-all"
                  style={{ height: `${heightPercent}%` }}
                />
                <div className="relative z-10 mt-auto">
                  <div className="text-2xl font-semibold text-white">{zone.total || 0}</div>
                  <div className="mt-2 text-[10px] text-white/70">{zone.name}</div>
                  <div className="mt-1 text-[9px] text-white/60">
                    {zone.passes || 0}P {zone.shots || 0}S {zone.touches || 0}T
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zone breakdown */}
      <div className="grid gap-2 md:grid-cols-5">
        {zoneStats.map((zone, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-3 text-[10px] shadow-lg"
          >
            <p className="font-medium text-white">{zone.name}</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-white/70">
                <span>Σύνολο</span>
                <span className="font-semibold text-white">{zone.total || 0}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Πάσες</span>
                <span>{zone.passes || 0}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Σουτ</span>
                <span>{zone.shots || 0}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Αγγίγματα</span>
                <span>{zone.touches || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


