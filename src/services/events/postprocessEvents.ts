export type RawEvent = {
  timeSec: number;
  label: string;      // "pass" | "shot" | "goal" | "touch"
  confidence: number; // 0..1
  extras?: {
    ballSpeedKmh?: number;
    goalDistanceM?: number;
    ballInGoal?: boolean;
    shotScore?: number;
    passScore?: number;
    goalScore?: number;
  };
};

export type CleanEvent = {
  timeSec: number;
  kind: "Pass" | "Shot" | "Goal" | "Touch";
  confidence: number;
};

const PRIORITY: Record<CleanEvent["kind"], number> = {
  Goal: 3,
  Shot: 2,
  Pass: 1,
  Touch: 0,
};

const DEFAULT_MIN_CONFIDENCE = 0.65;
const DEFAULT_MIN_GAP_SEC: Record<CleanEvent["kind"], number> = {
  Goal: 5,
  Shot: 3,
  Pass: 2,
  Touch: 1,
};

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_TOP_K_PER_WINDOW = 2;
const DEFAULT_CROSS_CLASS_GAP = 2; // δευτ: αν υπάρχει ανώτερο event μέσα σε αυτό, πέτα το κατώτερο
const SCORE_MARGIN = 0.15;

export type PostprocessOptions = {
  minConfidence?: number;
  minGapSec?: Record<CleanEvent["kind"], number>;
  windowSeconds?: number;
  topKPerWindow?: number;
  crossClassGap?: number;
};

function normalizeLabel(lbl: string): CleanEvent["kind"] | null {
  const k = lbl.toLowerCase();
  if (k.includes("goal")) return "Goal";
  if (k.includes("shot") || k.includes("shoot")) return "Shot";
  if (k.includes("pass")) return "Pass";
  if (k.includes("touch")) return "Touch";
  return null;
}

// Pass → Shot/Goal με πιο αυστηρά κριτήρια
function upgradePass(ev: RawEvent, base: CleanEvent["kind"]): CleanEvent["kind"] {
  if (base !== "Pass") return base;

  const speed = ev.extras?.ballSpeedKmh ?? 0;
  const dist = ev.extras?.goalDistanceM ?? 999;
  const inGoal = ev.extras?.ballInGoal ?? false;
  const shotScore = ev.extras?.shotScore ?? 0;
  const passScore = ev.extras?.passScore ?? 0;
  const goalScore = ev.extras?.goalScore ?? 0;

  // Goal
  if (inGoal || (dist < 11 && speed > 42) || (goalScore - passScore) >= SCORE_MARGIN) {
    return "Goal";
  }

  // Shot
  if ((speed > 34 && dist < 26) || (shotScore - passScore) >= SCORE_MARGIN) {
    return "Shot";
  }

  return base;
}

// Συγχώνευση ίδιων events κοντά χρονικά (κρατά το καλύτερο)
function dedupeSame(
  events: CleanEvent[],
  minGapSec: Record<CleanEvent["kind"], number>
): CleanEvent[] {
  const out: CleanEvent[] = [];
  for (const ev of events) {
    const last = out[out.length - 1];
    if (
      last &&
      ev.kind === last.kind &&
      Math.abs(ev.timeSec - last.timeSec) < minGapSec[ev.kind]
    ) {
      if (ev.confidence > last.confidence) out[out.length - 1] = ev;
      continue;
    }
    out.push(ev);
  }
  return out;
}

// Αλληλοαποκλεισμός: αν υπάρχει ανώτερη κλάση πολύ κοντά, πέτα την κατώτερη
function resolveCrossClass(events: CleanEvent[], crossClassGap: number): CleanEvent[] {
  const out: CleanEvent[] = [];
  for (const ev of events) {
    let keep = true;

    // αν υπάρχει ήδη ισχυρότερο πολύ κοντά, μην το κρατήσεις
    for (const kept of out) {
      if (Math.abs(ev.timeSec - kept.timeSec) <= crossClassGap) {
        if (PRIORITY[kept.kind] > PRIORITY[ev.kind]) {
          keep = false;
          break;
        }
        if (PRIORITY[kept.kind] === PRIORITY[ev.kind]) {
          // ίδια προτεραιότητα, κράτα το μεγαλύτερο confidence
          if (kept.confidence >= ev.confidence) {
            keep = false;
            break;
          } else {
            // αντικατάσταση
            const idx = out.indexOf(kept);
            out.splice(idx, 1);
            break;
          }
        }
      }
    }
    if (keep) out.push(ev);
  }
  return out;
}

// Top-k ανά παράθυρο
function topKPerWindow(events: CleanEvent[], windowSeconds: number, topK: number): CleanEvent[] {
  if (!Number.isFinite(topK)) return events;
  if (topK <= 0) return [];
  if (topK >= events.length) return events;
  const buckets = new Map<number, CleanEvent[]>();
  for (const ev of events) {
    const b = Math.floor(ev.timeSec / Math.max(1, windowSeconds));
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b)!.push(ev);
  }

  const res: CleanEvent[] = [];
  for (const [, arr] of buckets) {
    arr.sort((a, b) => {
      if (a.confidence === b.confidence) return PRIORITY[b.kind] - PRIORITY[a.kind];
      return b.confidence - a.confidence;
    });
    res.push(...arr.slice(0, topK));
  }
  return res;
}

export function postprocessEvents(
  raw: RawEvent[],
  videoDurationSec: number,
  options: PostprocessOptions = {}
): CleanEvent[] {
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const minGapSec = options.minGapSec ?? DEFAULT_MIN_GAP_SEC;
  const windowSeconds = options.windowSeconds ?? DEFAULT_WINDOW_SECONDS;
  const topKLimit = options.topKPerWindow ?? DEFAULT_TOP_K_PER_WINDOW;
  const crossClassGap = options.crossClassGap ?? DEFAULT_CROSS_CLASS_GAP;

  let evs: CleanEvent[] = raw
    .map((ev) => {
      const base = normalizeLabel(ev.label);
      if (!base) return null;

      const upgraded = upgradePass(ev, base);

      return {
        timeSec: Math.max(0, Math.min(ev.timeSec, videoDurationSec)),
        kind: upgraded,
        confidence: ev.confidence,
      } as CleanEvent;
    })
    .filter((e): e is CleanEvent => !!e && e.confidence >= minConfidence);

  // ταξινόμηση: χρόνος -> προτεραιότητα -> confidence
  evs.sort((a, b) => {
    if (a.timeSec !== b.timeSec) return a.timeSec - b.timeSec;
    if (PRIORITY[a.kind] !== PRIORITY[b.kind]) return PRIORITY[b.kind] - PRIORITY[a.kind];
    return b.confidence - a.confidence;
  });

  evs = dedupeSame(evs, minGapSec);                     // ίδια κλάση, κοντά
  evs = resolveCrossClass(evs, crossClassGap);          // ανώτερη κλάση κερδίζει σε κοντινό χρόνο
  evs = topKPerWindow(evs, windowSeconds, topKLimit); // κόψε θόρυβο, κράτα top-k/παράθυρο

  evs.sort((a, b) => a.timeSec - b.timeSec);

  return evs;
}
