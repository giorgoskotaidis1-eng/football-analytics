"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

interface Player {
  id: number;
  name: string;
  position: string;
  number?: number | null;
}

interface LineupPosition {
  playerId: number | null;
  x: number; // 0-100 (percentage of pitch width)
  y: number; // 0-100 (percentage of pitch height)
  player?: Player;
}

interface Formation {
  name: string;
  positions: { x: number; y: number }[];
}

const FORMATIONS: Record<string, Formation> = {
  "4-4-2": {
    name: "4-4-2",
    positions: [
      // GK
      { x: 5, y: 50 },
      // Defense
      { x: 20, y: 20 },
      { x: 20, y: 40 },
      { x: 20, y: 60 },
      { x: 20, y: 80 },
      // Midfield
      { x: 45, y: 20 },
      { x: 45, y: 40 },
      { x: 45, y: 60 },
      { x: 45, y: 80 },
      // Attack
      { x: 75, y: 40 },
      { x: 75, y: 60 },
    ],
  },
  "4-3-3": {
    name: "4-3-3",
    positions: [
      // GK
      { x: 5, y: 50 },
      // Defense
      { x: 20, y: 20 },
      { x: 20, y: 40 },
      { x: 20, y: 60 },
      { x: 20, y: 80 },
      // Midfield
      { x: 45, y: 30 },
      { x: 45, y: 50 },
      { x: 45, y: 70 },
      // Attack
      { x: 75, y: 20 },
      { x: 75, y: 50 },
      { x: 75, y: 80 },
    ],
  },
  "3-5-2": {
    name: "3-5-2",
    positions: [
      // GK
      { x: 5, y: 50 },
      // Defense
      { x: 20, y: 30 },
      { x: 20, y: 50 },
      { x: 20, y: 70 },
      // Midfield
      { x: 45, y: 15 },
      { x: 45, y: 35 },
      { x: 45, y: 50 },
      { x: 45, y: 65 },
      { x: 45, y: 85 },
      // Attack
      { x: 75, y: 40 },
      { x: 75, y: 60 },
    ],
  },
  "4-2-3-1": {
    name: "4-2-3-1",
    positions: [
      // GK
      { x: 5, y: 50 },
      // Defense
      { x: 20, y: 20 },
      { x: 20, y: 40 },
      { x: 20, y: 60 },
      { x: 20, y: 80 },
      // Defensive Midfield
      { x: 40, y: 40 },
      { x: 40, y: 60 },
      // Attacking Midfield
      { x: 60, y: 25 },
      { x: 60, y: 50 },
      { x: 60, y: 75 },
      // Attack
      { x: 80, y: 50 },
    ],
  },
  "3-4-3": {
    name: "3-4-3",
    positions: [
      // GK
      { x: 5, y: 50 },
      // Defense
      { x: 20, y: 30 },
      { x: 20, y: 50 },
      { x: 20, y: 70 },
      // Midfield
      { x: 45, y: 20 },
      { x: 45, y: 40 },
      { x: 45, y: 60 },
      { x: 45, y: 80 },
      // Attack
      { x: 75, y: 25 },
      { x: 75, y: 50 },
      { x: 75, y: 75 },
    ],
  },
};

interface LineupEditorProps {
  matchId: number;
  teamId: number | null; // Allow null for opponent teams
  teamName: string;
  players: Player[];
  onSave?: () => void;
  onPlayerAdded?: (player: Player) => void;
}

export function LineupEditor({ matchId, teamId, teamName, players: propPlayers, onSave, onPlayerAdded }: LineupEditorProps) {
  // Load persisted formation from localStorage
  const storageKey = `lineup_${matchId}_${teamId}`;
  const loadFormation = (): string => {
    if (typeof window === "undefined") return "4-4-2";
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.formation && typeof parsed.formation === "string") {
          return parsed.formation;
        }
      }
    } catch (e) {
      console.warn("[LineupEditor] Failed to load formation:", e);
    }
    return "4-4-2";
  };

  const [selectedFormation, setSelectedFormation] = useState<string>(loadFormation());
  const [lineup, setLineup] = useState<LineupPosition[]>([]);
  
  // Save formation to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ formation: selectedFormation }));
    } catch (e) {
      console.warn("[LineupEditor] Failed to save formation:", e);
    }
  }, [selectedFormation, storageKey]);
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [draggedPosition, setDraggedPosition] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [clickedPositionIndex, setClickedPositionIndex] = useState<number | null>(null);
  const [localPlayers, setLocalPlayers] = useState<Player[]>([]);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPosition, setNewPlayerPosition] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState<number | null>(null);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const pitchRef = useRef<HTMLDivElement>(null);

  // Use prop players if available, otherwise fetch from API
  const players = propPlayers.length > 0 ? propPlayers : localPlayers;

  useEffect(() => {
    // Load existing lineup
    fetch(`/api/matches/${matchId}/lineup?teamId=${teamId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.lineup) {
          setLineup(data.lineup);
          if (data.formation) {
            setSelectedFormation(data.formation);
          }
        } else {
          // Initialize with formation
          applyFormation(selectedFormation);
        }
      })
      .catch(() => {
        applyFormation(selectedFormation);
      });
  }, [matchId, teamId]);

  // Fetch players for this team if not provided via props
  // Skip if teamId is null (opponent team without registered players)
  useEffect(() => {
    if (propPlayers.length === 0 && teamId !== null) {
      fetch(`/api/players?teamId=${teamId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.players) {
            const mappedPlayers = data.players.map((p: any) => ({
              id: p.id,
              name: p.name,
              position: p.position || "",
              number: p.number || null,
            }));
            setLocalPlayers(mappedPlayers);
            console.log(`[LineupEditor] Fetched ${mappedPlayers.length} players for team ${teamId} from API`);
          }
        })
        .catch((error) => {
          console.error(`[LineupEditor] Error fetching players for team ${teamId}:`, error);
        });
    } else if (teamId === null) {
      // For opponent teams, start with empty players list
      setLocalPlayers([]);
    }
  }, [teamId, propPlayers.length]);


  function applyFormation(formationName: string) {
    const formation = FORMATIONS[formationName];
    if (!formation) return;

    const newLineup: LineupPosition[] = formation.positions.map((pos) => ({
      playerId: null,
      x: pos.x,
      y: pos.y,
    }));

    // Try to match existing players to positions
    if (lineup.length > 0) {
      newLineup.forEach((pos, idx) => {
        const existing = lineup.find((l) => l.x === pos.x && l.y === pos.y);
        if (existing && existing.playerId) {
          pos.playerId = existing.playerId;
          pos.player = existing.player;
        }
      });
    }

    setLineup(newLineup);
  }

  function handleFormationChange(formation: string) {
    setSelectedFormation(formation);
    applyFormation(formation);
  }

  function handlePlayerDragStart(player: Player) {
    setDraggedPlayer(player);
  }

  function handlePlayerDragEnd() {
    setDraggedPlayer(null);
    setDraggedPosition(null);
  }

  function handlePositionDrop(positionIndex: number) {
    if (!draggedPlayer) return;

    const newLineup = [...lineup];
    newLineup[positionIndex] = {
      ...newLineup[positionIndex],
      playerId: draggedPlayer.id,
      player: draggedPlayer,
    };
    setLineup(newLineup);
    setDraggedPlayer(null);
    toast.success(`${draggedPlayer.name} προστέθηκε στη θέση`, { duration: 1500 });
  }

  function assignPlayerToPosition(player: Player, positionIndex: number) {
    if (!player) return;

    const newLineup = [...lineup];
    newLineup[positionIndex] = {
      ...newLineup[positionIndex],
      playerId: player.id,
      player: player,
    };
    setLineup(newLineup);
    setDraggedPlayer(null);
    toast.success(`${player.name} προστέθηκε στη θέση`, { duration: 1500 });
  }

  function handlePositionClick(positionIndex: number) {
    if (draggedPlayer) {
      handlePositionDrop(positionIndex);
      setDraggedPlayer(null); // Clear selection after adding
    } else if (lineup[positionIndex]?.playerId) {
      // If position has a player, remove it
      const newLineup = [...lineup];
      newLineup[positionIndex] = {
        ...newLineup[positionIndex],
        playerId: null,
        player: undefined,
      };
      setLineup(newLineup);
    } else {
      // If position is empty, open player selection
      setClickedPositionIndex(positionIndex);
    }
  }

  function handleSelectPlayerForPosition(player: Player) {
    if (clickedPositionIndex === null) return;

    const newLineup = [...lineup];
    newLineup[clickedPositionIndex] = {
      ...newLineup[clickedPositionIndex],
      playerId: player.id,
      player: player,
    };
    setLineup(newLineup);
    setClickedPositionIndex(null);
    toast.success(`${player.name} προστέθηκε στη θέση`, { duration: 1500 });
  }

  function handlePitchClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!draggedPlayer || !pitchRef.current) return;

    const rect = pitchRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Find closest position
    let closestIdx = 0;
    let minDist = Infinity;
    lineup.forEach((pos, idx) => {
      const dist = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    if (minDist < 10) {
      handlePositionDrop(closestIdx);
    }
  }

  async function handleAddPlayer() {
    if (!newPlayerName.trim() || !newPlayerPosition.trim()) {
      toast.error("Name and position are required");
      return;
    }

    setAddingPlayer(true);
    try {
      // Create a temporary player object (not saved to database, just for this match)
      const tempPlayer: Player = {
        id: Date.now(), // Temporary ID (negative or timestamp-based)
        name: newPlayerName.trim(),
        position: newPlayerPosition.trim(),
        number: newPlayerNumber || null,
      };

      // Add to local players list
      const updatedPlayers = [...players, tempPlayer];
      setLocalPlayers((prev) => [...prev, tempPlayer]);
      
      // Call callback if provided
      onPlayerAdded?.(tempPlayer);

      // Reset form
      setNewPlayerName("");
      setNewPlayerPosition("");
      setNewPlayerNumber(null);
      setShowAddPlayerModal(false);

      toast.success(`${tempPlayer.name} added!`);
    } catch (error) {
      toast.error("Αποτυχία προσθήκης παίκτη");
    } finally {
      setAddingPlayer(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamId || null, // Allow null for opponent teams
          teamName: teamId === null ? teamName : undefined, // Include team name if no teamId
          formation: selectedFormation,
          positions: lineup.map((pos) => ({
            playerId: pos.playerId,
            playerName: pos.player?.name, // Include player name for temporary players
            x: pos.x,
            y: pos.y,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success("Η ενδεκάδα αποθηκεύτηκε επιτυχώς!");
        onSave?.();
      } else {
        toast.error(data.message || "Αποτυχία αποθήκευσης ενδεκάδας");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }


  // Calculate available players (not already in lineup)
  const availablePlayers = players.filter(
    (p) => !lineup.some((l) => l.playerId === p.id)
  );

  // Debug: Log players to see what we're getting
  useEffect(() => {
    const playersInLineup = lineup.filter(l => l.playerId).length;
    const available = players.filter(
      (p) => !lineup.some((l) => l.playerId === p.id)
    );
    console.log(`[LineupEditor] Team ${teamId} (${teamName}):`, {
      totalPlayers: players.length,
      playersInLineup,
      availablePlayers: available.length,
      playerNames: players.map(p => p.name),
      availablePlayerNames: available.map(p => p.name),
    });
  }, [players, lineup, teamId, teamName]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm md:text-[11px] font-medium text-slate-300">{teamName}</p>
          <p className="text-xs md:text-[10px] text-slate-500">Πατήστε παίκτες για να τους αναθέσετε θέσεις</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedFormation}
              onChange={(e) => handleFormationChange(e.target.value)}
              className="h-11 md:h-8 rounded-md border border-slate-800 bg-slate-900 px-3 md:px-2 pr-8 md:pr-6 text-sm md:text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60 touch-manipulation appearance-none cursor-pointer"
            >
              {Object.keys(FORMATIONS).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {/* Formation Preview */}
          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded border border-slate-800 bg-slate-900/50">
            <span className="text-[9px] text-slate-400">Σχηματισμός:</span>
            <span className="text-[10px] font-semibold text-emerald-400">{selectedFormation}</span>
          </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-11 md:h-8 rounded-md bg-emerald-500 px-4 md:px-3 text-sm md:text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation min-w-[100px]"
                  >
            {saving ? "Αποθήκευση..." : "Αποθήκευση Ενδεκάδας"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Pitch - Full size professional - Tablet optimized */}
        <div
          ref={pitchRef}
          onClick={handlePitchClick}
          onTouchStart={(e) => {
            // Handle touch for tablets
            if (draggedPlayer && pitchRef.current) {
              const touch = e.touches[0];
              const rect = pitchRef.current.getBoundingClientRect();
              const x = ((touch.clientX - rect.left) / rect.width) * 100;
              const y = ((touch.clientY - rect.top) / rect.height) * 100;
              
              // Find closest position
              let closestIdx = 0;
              let minDist = Infinity;
              lineup.forEach((pos, idx) => {
                const dist = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
                if (dist < minDist) {
                  minDist = dist;
                  closestIdx = idx;
                }
              });
              
              if (minDist < 10 && draggedPlayer) {
                assignPlayerToPosition(draggedPlayer, closestIdx);
                setDraggedPlayer(null);
              }
            }
          }}
          className="relative aspect-[3/2] rounded-lg border-2 border-white/30 bg-gradient-to-br from-emerald-900/40 via-emerald-800/30 to-emerald-900/40 touch-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px),
              repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)
            `,
          }}
        >
          {/* Full pitch outline */}
          <div className="absolute inset-0 border-2 border-white/30" />
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-white/30" />
          {/* Center circle */}
          <div className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30" />
          {/* Penalty boxes */}
          <div className="absolute left-0 top-[20%] h-[60%] w-[18%] rounded-r-full border-2 border-r-white/30 border-t-white/30 border-b-white/30" />
          <div className="absolute right-0 top-[20%] h-[60%] w-[18%] rounded-l-full border-2 border-l-white/30 border-t-white/30 border-b-white/30" />
          {/* Goal boxes */}
          <div className="absolute left-0 top-[35%] h-[30%] w-[6%] rounded-r border-2 border-r-white/30 border-t-white/30 border-b-white/30" />
          <div className="absolute right-0 top-[35%] h-[30%] w-[6%] rounded-l border-2 border-l-white/30 border-t-white/30 border-b-white/30" />
          {/* Corner arcs */}
          <div className="absolute left-0 top-0 h-8 w-8 rounded-br-full border-r-2 border-b-2 border-white/30" />
          <div className="absolute left-0 bottom-0 h-8 w-8 rounded-tr-full border-r-2 border-t-2 border-white/30" />
          <div className="absolute right-0 top-0 h-8 w-8 rounded-bl-full border-l-2 border-b-2 border-white/30" />
          <div className="absolute right-0 bottom-0 h-8 w-8 rounded-tl-full border-l-2 border-t-2 border-white/30" />

          {/* Formation Lines - Visual connections between players */}
          {selectedFormation && FORMATIONS[selectedFormation] && (
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
              {(() => {
                const formation = FORMATIONS[selectedFormation];
                const lines: JSX.Element[] = [];
                
                // Draw lines between players in same "line" (defense, midfield, attack)
                // Group positions by approximate Y coordinate
                const groups: { [key: string]: number[] } = {};
                formation.positions.forEach((pos, idx) => {
                  const groupKey = Math.round(pos.y / 10).toString();
                  if (!groups[groupKey]) groups[groupKey] = [];
                  groups[groupKey].push(idx);
                });
                
                // Draw lines within each group (horizontal lines)
                Object.values(groups).forEach((indices) => {
                  if (indices.length > 1) {
                    const sorted = indices.sort((a, b) => formation.positions[a].x - formation.positions[b].x);
                    for (let i = 0; i < sorted.length - 1; i++) {
                      const pos1 = formation.positions[sorted[i]];
                      const pos2 = formation.positions[sorted[i + 1]];
                      lines.push(
                        <line
                          key={`line-${sorted[i]}-${sorted[i + 1]}`}
                          x1={`${pos1.x}%`}
                          y1={`${pos1.y}%`}
                          x2={`${pos2.x}%`}
                          y2={`${pos2.y}%`}
                          stroke="rgba(16, 185, 129, 0.2)"
                          strokeWidth="1.5"
                          strokeDasharray="3,3"
                        />
                      );
                    }
                  }
                });
                
                return lines;
              })()}
            </svg>
          )}

          {/* Player positions */}
          {lineup.map((pos, idx) => (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                handlePositionClick(idx);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDraggedPosition(idx);
              }}
              onDragLeave={() => {
                if (draggedPosition === idx) {
                  setDraggedPosition(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handlePositionDrop(idx);
                setDraggedPosition(null);
              }}
              draggable={!!pos.player}
              onDragStart={(e) => {
                if (pos.player) {
                  e.dataTransfer.effectAllowed = "move";
                  setDraggedPosition(idx);
                }
              }}
              onDragEnd={() => {
                setDraggedPosition(null);
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 transition-all touch-manipulation z-10 ${
                pos.playerId
                  ? "h-12 w-12 md:h-10 md:w-10 border-emerald-500 bg-emerald-500/20 shadow-lg shadow-emerald-500/20 active:scale-95 hover:scale-105"
                  : "h-10 w-10 md:h-8 md:w-8 border-slate-600 bg-slate-800/50 hover:border-emerald-500/50 hover:bg-slate-700/50 active:scale-95"
              } ${draggedPosition === idx ? "scale-125 border-emerald-400 ring-2 ring-emerald-400/50 shadow-xl" : ""} ${
                clickedPositionIndex === idx ? "ring-2 ring-emerald-400 scale-110" : ""
              } ${draggedPlayer ? "hover:border-emerald-400 hover:bg-emerald-500/30" : ""}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
            >
              {pos.player ? (
                <div className="flex h-full w-full items-center justify-center relative">
                  <span className="text-xs md:text-[10px] font-bold text-white drop-shadow-sm">
                    {pos.player.number || pos.player.name.charAt(0)}
                  </span>
                  {/* Player name tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                    {pos.player.name}
                  </div>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-[10px] md:text-[8px] text-slate-400">+</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Available Players */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-300">Available Players</p>
              {/* Show "Add Player" button for opponent teams (no teamId) */}
              {teamId === null && (
                <button
                  onClick={() => setShowAddPlayerModal(true)}
                  className="h-8 rounded-md bg-emerald-500 px-3 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 transition touch-manipulation"
                >
                  + Προσθήκη Παίκτη
                </button>
              )}
            </div>
            {availablePlayers.length > 0 && (
              <select
                onChange={(e) => {
                  const playerId = parseInt(e.target.value);
                  if (playerId && draggedPlayer === null) {
                    const selectedPlayer = availablePlayers.find((p) => p.id === playerId);
                    if (selectedPlayer) {
                      setDraggedPlayer(selectedPlayer);
                      toast.success(`Selected ${selectedPlayer.name}. Click on a position to add.`, {
                        duration: 2000,
                      });
                    }
                  }
                  e.target.value = "";
                }}
                className="h-11 md:h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-3 md:px-2 text-sm md:text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60 touch-manipulation"
              >
                <option value="">Select player to add...</option>
                {availablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.number ? `#${player.number} ` : ""}
                    {player.name} ({player.position})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="max-h-[400px] md:max-h-96 space-y-2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-3 md:p-2">
            {availablePlayers.length === 0 ? (
              <p className="text-center text-sm md:text-[10px] text-slate-500 py-4">Όλοι οι παίκτες έχουν ανατεθεί</p>
            ) : (
              availablePlayers.map((player) => (
                <div
                  key={player.id}
                  draggable
                  onDragStart={() => handlePlayerDragStart(player)}
                  onDragEnd={handlePlayerDragEnd}
                  onClick={() => {
                    if (draggedPlayer?.id === player.id) {
                      setDraggedPlayer(null);
                    } else {
                      setDraggedPlayer(player);
                      toast.success(`Selected ${player.name}. Click on a position to add.`, {
                        duration: 2000,
                      });
                    }
                  }}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 md:px-2 md:py-1.5 text-sm md:text-[11px] transition touch-manipulation min-h-[44px] md:min-h-0 ${
                    draggedPlayer?.id === player.id
                      ? "border-emerald-500 bg-emerald-500/20 text-slate-200 active:scale-95"
                      : "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 active:scale-95"
                  }`}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-semibold text-emerald-300">
                    {player.number || player.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-medium">{player.name}</p>
                    <p className="text-[9px] text-slate-500">{player.position}</p>
                  </div>
                  {draggedPlayer?.id === player.id && (
                    <span className="text-[9px] text-emerald-400">Selected</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Assigned Players */}
          <div className="space-y-2">
            <p className="text-sm md:text-[11px] font-medium text-slate-300">Ενδεκάδα</p>
            <div className="space-y-1.5 md:space-y-1 rounded-lg border border-slate-800 bg-slate-950 p-3 md:p-2">
              {lineup
                .filter((pos) => pos.playerId)
                .map((pos, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 md:px-2 md:py-1 text-sm md:text-[10px] text-slate-300 min-h-[44px] md:min-h-0"
                  >
                    <div className="flex h-6 w-6 md:h-5 md:w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs md:text-[9px] font-semibold text-emerald-300">
                      {pos.player?.number || pos.player?.name.charAt(0)}
                    </div>
                    <span className="flex-1">{pos.player?.name}</span>
                    <span className="text-slate-500">{pos.player?.position}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Player Modal */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/95 p-5 text-xs text-slate-200 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Add Player
                </p>
                <p className="text-[11px] text-slate-500">
                  Add a player for {teamName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddPlayerModal(false);
                  setNewPlayerName("");
                  setNewPlayerPosition("");
                  setNewPlayerNumber(null);
                }}
                className="h-6 w-6 rounded-full bg-slate-900 text-[11px] text-slate-400 hover:bg-slate-800"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-300">Name *</label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Player name"
                  className="mt-1 h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-300">Position *</label>
                <select
                  value={newPlayerPosition}
                  onChange={(e) => setNewPlayerPosition(e.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                >
                  <option value="">Select position...</option>
                  <option value="GK">GK - Goalkeeper</option>
                  <option value="CB">CB - Centre Back</option>
                  <option value="LB">LB - Left Back</option>
                  <option value="RB">RB - Right Back</option>
                  <option value="CDM">CDM - Defensive Midfielder</option>
                  <option value="CM">CM - Central Midfielder</option>
                  <option value="LM">LM - Left Midfielder</option>
                  <option value="RM">RM - Right Midfielder</option>
                  <option value="CAM">CAM - Attacking Midfielder</option>
                  <option value="LW">LW - Left Winger</option>
                  <option value="RW">RW - Right Winger</option>
                  <option value="CF">CF - Centre Forward</option>
                  <option value="ST">ST - Striker</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-300">Number (optional)</label>
                <input
                  type="number"
                  value={newPlayerNumber || ""}
                  onChange={(e) => setNewPlayerNumber(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Jersey number"
                  min="1"
                  max="99"
                  className="mt-1 h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                />
              </div>
              <button
                onClick={handleAddPlayer}
                disabled={addingPlayer || !newPlayerName.trim() || !newPlayerPosition.trim()}
                className="h-8 w-full rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 transition"
              >
                {addingPlayer ? "Adding..." : "Add Player"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Selection Modal for Position */}
      {clickedPositionIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/95 p-5 text-xs text-slate-200 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Select Player
                </p>
                <p className="text-[11px] text-slate-500">
                  Choose a player for this position
                </p>
              </div>
              <button
                onClick={() => setClickedPositionIndex(null)}
                className="h-6 w-6 rounded-full bg-slate-900 text-[11px] text-slate-400 hover:bg-slate-800"
              >
                ×
              </button>
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              {availablePlayers.length === 0 ? (
                <p className="text-center text-[10px] text-slate-500 py-4">
                  No available players. All players are assigned.
                </p>
              ) : (
                availablePlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectPlayerForPosition(player)}
                    className="flex w-full items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-left text-[11px] text-slate-200 transition hover:border-emerald-500 hover:bg-emerald-500/10"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-semibold text-emerald-300">
                      {player.number || player.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-medium">{player.name}</p>
                      <p className="text-[9px] text-slate-500">{player.position}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
