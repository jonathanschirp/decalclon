import type { Athlete, Competition, EventDefinition } from '../types';
import { getEventsForType } from './events';
import { calculatePoints, pointsToMark } from './scoring';
import { calculatePredictedScores } from './predictions';

/**
 * Each slider spans ±BAND_PCT of the anchor **in points** — a bad day on one
 * side, a 20% improvement on the other. Symmetric, so the anchor sits dead
 * centre.
 */
export const BAND_PCT = 0.2;

/**
 * Fallback anchor (points) for an event where the athlete has no usable PB.
 * World Athletics points are broadly comparable across events, so a single
 * "average competitive result" works as the stand-in centre. ~800/event ≈ an
 * 8000 decathlon.
 */
export const AVERAGE_POINTS = 800;

export type SplitStatus = 'comfortable' | 'stretch';
export type Verdict = 'comfortable' | 'feasible' | 'infeasible';
export type CalcMode = 'explore' | 'target';

/** Per-remaining-event context, independent of the chosen marks. */
export interface RemainingEvent {
  event: EventDefinition;
  /** The athlete's real PB mark, or null if none on file. */
  pbMark: number | null;
  /** Whether the band is anchored on a real PB (vs the average fallback). */
  usePb: boolean;
  /** Mark shown as the centre of the scale (PB, or the average result). */
  anchorMark: number;
  /** Points at the anchor — the band centre. */
  anchorPoints: number;
  /** Bottom of the slider range (anchor − 20%). */
  floorPoints: number;
  /** Top of the slider range (anchor + 20%). */
  ceilingPoints: number;
  /** Where the handle starts — the anchor. */
  startPoints: number;
}

/** Static, target-independent model derived from a competition + athlete. */
export interface TargetModel {
  athlete: Athlete;
  banked: number;
  remaining: RemainingEvent[];
  /** Points if every remaining event sat exactly at PB. */
  pbProjection: number;
  withdrawn: boolean;
  /** No remaining events — nothing left to plan. */
  allDone: boolean;
}

/**
 * Derive the target-splits model for one athlete: what they've banked, which
 * events remain, and each remaining event's PB anchor, slider floor and ceiling.
 * Reuses the app's prediction engine so "banked" and "remaining" match the board.
 */
export function buildTargetModel(competition: Competition, athlete: Athlete): TargetModel {
  const events = getEventsForType(competition.type);
  const [score] = calculatePredictedScores(competition, [athlete]);

  const banked = score?.totalActualPoints ?? 0;
  const remaining: RemainingEvent[] = [];

  for (const event of events) {
    const es = score?.eventScores[event.id];
    if (es?.isActual) continue; // contested (incl. no-mark) — not remaining
    const pbMark = athlete.personalBests[event.id] ?? null;
    const pbPoints = pbMark != null ? calculatePoints(event, pbMark) : 0;
    // Anchor on the PB when it scores; otherwise fall back to an average result.
    const usePb = pbMark != null && pbPoints > 0;
    const anchorPoints = usePb ? pbPoints : AVERAGE_POINTS;
    const anchorMark = usePb ? (pbMark as number) : pointsToMark(event, anchorPoints);
    remaining.push({
      event,
      pbMark,
      usePb,
      anchorMark,
      anchorPoints,
      floorPoints: Math.round(anchorPoints * (1 - BAND_PCT)),
      ceilingPoints: Math.round(anchorPoints * (1 + BAND_PCT)),
      startPoints: anchorPoints,
    });
  }

  const pbProjection = banked + remaining.reduce((t, r) => t + r.anchorPoints, 0);

  return {
    athlete,
    banked,
    remaining,
    pbProjection,
    withdrawn: score?.withdrawn ?? false,
    allDone: remaining.length === 0,
  };
}

/** Clamp a points value into an event's [floor, ceiling] slider range. */
export function clampToEvent(r: RemainingEvent, points: number): number {
  return Math.max(r.floorPoints, Math.min(r.ceilingPoints, points));
}

interface FillItem {
  value: number;
  min: number;
  max: number;
}

/**
 * Adjust `items` from their current values so they sum to `targetSum`, keeping
 * each within [min, max] and moving them in proportion to the room each has in
 * the needed direction. Used to couple the unlocked sliders in target mode:
 * pushing one event up pulls the others down (and vice-versa) so the total holds.
 * If the bounds can't reach `targetSum`, the values settle as close as possible.
 */
export function waterfill(items: FillItem[], targetSum: number): number[] {
  const v = items.map((i) => Math.max(i.min, Math.min(i.max, i.value)));
  for (let iter = 0; iter < 60; iter++) {
    const sum = v.reduce((a, b) => a + b, 0);
    const diff = targetSum - sum;
    if (Math.abs(diff) < 0.5) break;
    const up = diff > 0;
    const room = v.map((val, k) => (up ? items[k].max - val : val - items[k].min));
    const totalRoom = room.reduce((a, b) => a + b, 0);
    if (totalRoom < 1e-6) break; // fully clamped — can't reach targetSum
    const move = Math.min(Math.abs(diff), totalRoom);
    for (let k = 0; k < v.length; k++) {
      if (room[k] <= 0) continue;
      v[k] += (up ? 1 : -1) * move * (room[k] / totalRoom);
    }
  }
  return v.map((x) => Math.round(x));
}

export interface SolvedRow {
  event: EventDefinition;
  usePb: boolean;
  anchorMark: number;
  anchorPoints: number;
  floorPoints: number;
  ceilingPoints: number;
  reqPoints: number;
  mark: number;
  status: SplitStatus;
  locked: boolean;
}

export interface Summary {
  mode: CalcMode;
  rows: SolvedRow[];
  sumReq: number;
  projected: number;
  // Target mode
  target: number;
  gap: number;
  verdict: Verdict;
  /** Lowest/highest total reachable with the remaining events at floor/ceiling. */
  reachableMin: number;
  reachableMax: number;
  // Explore mode
  combinedPB: number | null;
  vsCombinedPB: number | null;
}

export interface SummaryInput {
  model: TargetModel;
  /** eventId -> chosen required points (the handle position). */
  req: Record<string, number>;
  mode: CalcMode;
  target: number;
  locks: Record<string, boolean>;
}

/** Turn the chosen per-event marks into display rows plus totals and a verdict. */
export function summarize({ model, req, mode, target, locks }: SummaryInput): Summary {
  const rows: SolvedRow[] = model.remaining.map((r) => {
    const reqPoints = Math.round(req[r.event.id] ?? r.startPoints);
    return {
      event: r.event,
      usePb: r.usePb,
      anchorMark: r.anchorMark,
      anchorPoints: r.anchorPoints,
      floorPoints: r.floorPoints,
      ceilingPoints: r.ceilingPoints,
      reqPoints,
      mark: pointsToMark(r.event, reqPoints),
      status: reqPoints > r.anchorPoints + 2 ? 'stretch' : 'comfortable',
      locked: !!locks[r.event.id],
    };
  });

  const sumReq = rows.reduce((t, row) => t + row.reqPoints, 0);
  const projected = model.banked + sumReq;

  const lockedSum = model.remaining
    .filter((r) => locks[r.event.id])
    .reduce((t, r) => t + Math.round(req[r.event.id] ?? r.startPoints), 0);
  const unlocked = model.remaining.filter((r) => !locks[r.event.id]);
  const reachableMin = model.banked + lockedSum + unlocked.reduce((t, r) => t + r.floorPoints, 0);
  const reachableMax = model.banked + lockedSum + unlocked.reduce((t, r) => t + r.ceilingPoints, 0);

  const verdict: Verdict =
    target > reachableMax ? 'infeasible' : target <= model.pbProjection ? 'comfortable' : 'feasible';

  const combinedPB = model.athlete.combinedPB ?? null;

  return {
    mode,
    rows,
    sumReq,
    projected,
    target,
    gap: Math.max(0, target - model.banked),
    verdict,
    reachableMin,
    reachableMax,
    combinedPB,
    vsCombinedPB: combinedPB != null ? projected - combinedPB : null,
  };
}
