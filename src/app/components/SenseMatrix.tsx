"use client";

interface Event {
  id: number;
  type: string;
  team: string;
  playerId: number | null;
  x: number | null;
  y: number | null;
  minute: number | null;
}

interface Player {
  id: number;
  name: string;
  number?: number | null;
}

interface SenseMatrixProps {
  events: Event[];
  players: Player[];
  team: "home" | "away";
}

export function SenseMatrix({ events, players, team }: SenseMatrixProps) {
  // Calculate player performance metrics with guards
  const playerMetrics = players
    .map((player) => {
      if (!player || !player.id) return null;
      
      const playerEvents = events.filter((e) => e && e.playerId === player.id && e.team === team);
      const shots = playerEvents.filter((e) => e.type === "shot").length;
      const passes = playerEvents.filter((e) => e.type === "pass").length;
      const touches = playerEvents.filter((e) => e.type === "touch").length;
      const tackles = playerEvents.filter((e) => e.type === "tackle").length;

      // Calculate Sense Score (weighted combination) with guards
      // Professional KPIs: defensive (tackles), creative (passes), possession (touches), attacking (shots)
      const defensiveScore = Number(tackles) || 0;
      const creativeScore = Number(passes) || 0;
      const possessionScore = Number(touches) || 0;
      const attackingScore = Number(shots) || 0;
      
      // Weighted sense score (normalized to 0-10)
      const rawScore = (attackingScore * 2) + (creativeScore * 0.5) + (possessionScore * 0.3) + (defensiveScore * 1.5);
      const senseScore = Math.min(10, Math.max(0, rawScore / 10));

      return {
        player,
        shots: Number(attackingScore) || 0,
        passes: Number(creativeScore) || 0,
        touches: Number(possessionScore) || 0,
        tackles: Number(defensiveScore) || 0,
        senseScore: Number(Math.round(senseScore * 10) / 10) || 0,
        totalActions: Number(playerEvents.length) || 0,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null && p.totalActions > 0)
    .sort((a, b) => (b.senseScore || 0) - (a.senseScore || 0))
    .slice(0, 11); // Top 11 players

  // Create matrix grid (8x8 = 64 cells)
  const gridSize = 8;
  const matrix: number[][] = Array(gridSize)
    .fill(0)
    .map(() => Array(gridSize).fill(0));

  // Fill matrix with player interactions (normalized coords 0-100)
  events
    .filter((e) => e && e.team === team && e.x !== null && e.y !== null)
    .forEach((event) => {
      const x = Number(event.x);
      const y = Number(event.y);
      if (!isNaN(x) && !isNaN(y) && x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        const gridX = Math.floor((x / 100) * gridSize);
        const gridY = Math.floor((y / 100) * gridSize);
        if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
          matrix[gridY][gridX] = (matrix[gridY][gridX] || 0) + 1;
        }
      }
    });

  const maxValue = Math.max(...matrix.flat(), 1);

  return (
    <div className="space-y-4">
      {/* Matrix Grid */}
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
        <p className="mb-3 text-[10px] text-slate-500">Πίνακας έντασης αλληλεπίδρασης</p>
        <div className="grid grid-cols-8 gap-px bg-slate-900">
          {matrix.flat().map((value, idx) => {
            const intensity = value / maxValue;
            const bgColor =
              intensity > 0.7
                ? "bg-emerald-500"
                : intensity > 0.4
                ? "bg-emerald-500/60"
                : intensity > 0.2
                ? "bg-emerald-500/30"
                : "bg-slate-900";
            const textColor = intensity > 0.4 ? "text-white" : "text-slate-500";

            return (
              <div
                key={idx}
                className={`flex h-8 items-center justify-center text-[9px] transition-all ${bgColor} ${textColor}`}
                title={`Intensity: ${value}`}
              >
                {value > 0 ? value : ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* Player Performance Table */}
      <div className="rounded-lg border border-slate-800 bg-slate-950">
        <div className="border-b border-slate-800 bg-slate-900/30 px-4 py-2">
          <p className="text-[11px] font-medium text-slate-200">Κορυφαίοι Παίκτες</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10px] text-slate-300">
            <thead className="bg-slate-900/50 text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Θέση</th>
                <th className="px-3 py-2 text-left font-medium">Παίκτης</th>
                <th className="px-3 py-2 text-center font-medium">Ενέργειες</th>
                <th className="px-3 py-2 text-right font-medium">Sense Score</th>
              </tr>
            </thead>
            <tbody>
              {playerMetrics.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                    Χωρίς δεδομένα
                  </td>
                </tr>
              ) : (
                playerMetrics.map((metric, idx) => (
                  <tr
                    key={metric.player.id}
                    className="border-t border-slate-800 hover:bg-slate-900/50"
                  >
                    <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200">
                          #{metric.player.number || "?"} {metric.player.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center text-slate-400">
                      {metric.totalActions || 0} ({metric.shots || 0}S {metric.passes || 0}P {metric.touches || 0}T)
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-semibold text-emerald-400">{(metric.senseScore || 0).toFixed(1)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


