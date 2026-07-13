import type { EventDefinition } from '../types';

// Events whose scoring B values are in centimeters while the app stores marks
// in meters (High Jump, Pole Vault, Long Jump). These need meter↔cm conversion
// on the way into and out of the scoring formula.
const CM_EVENTS = [
  'dec_high_jump', 'dec_pole_vault', 'dec_long_jump',
  'hep_high_jump', 'hep_long_jump',
];

/**
 * Convert a performance value to the unit expected by the scoring formula.
 * - High Jump, Pole Vault, Long Jump: formula expects centimeters, input is meters
 * - All others: used as-is
 */
function toFormulaUnit(event: EventDefinition, performance: number): number {
  return CM_EVENTS.includes(event.id) ? performance * 100 : performance;
}

/** Inverse of toFormulaUnit: convert a formula-space value back to the stored mark. */
function fromFormulaUnit(event: EventDefinition, formulaValue: number): number {
  return CM_EVENTS.includes(event.id) ? formulaValue / 100 : formulaValue;
}

/**
 * Calculate points for a single event performance using World Athletics scoring tables.
 *
 * Track events: Points = INT(A × (B − P)^C) where lower P is better
 * Field events: Points = INT(A × (P − B)^C) where higher P is better
 */
export function calculatePoints(event: EventDefinition, performance: number): number {
  const { A, B, C } = event.scoringConstants;
  const P = toFormulaUnit(event, performance);

  let points: number;

  if (event.type === 'track') {
    // Lower time is better: Points = A × (B − P)^C
    if (P >= B) return 0; // Performance worse than baseline
    points = A * Math.pow(B - P, C);
  } else {
    // Higher distance/height is better: Points = A × (P − B)^C
    if (P <= B) return 0; // Performance worse than baseline
    points = A * Math.pow(P - B, C);
  }

  return Math.floor(points);
}

/**
 * Inverse of calculatePoints: the (continuous, unrounded) mark that yields a
 * given points total. Used by the Target Splits calculator to turn a required
 * points figure back into a concrete time/distance/height.
 *
 * Track: P = B − (points / A)^(1/C)   (lower is better)
 * Field: P = B + (points / A)^(1/C)   (higher is better)
 *
 * For points ≤ 0 there is no positive mark, so we return the zero-point
 * baseline (just past B).
 */
export function pointsToMark(event: EventDefinition, points: number): number {
  const { A, B, C } = event.scoringConstants;

  if (points <= 0) {
    // Baseline: the threshold mark worth ~0 points, nudged to the scoring side of B.
    const baseline = event.type === 'track' ? B - 0.01 : B + 0.01;
    return fromFormulaUnit(event, baseline);
  }

  const delta = Math.pow(points / A, 1 / C);
  const P = event.type === 'track' ? B - delta : B + delta;
  return fromFormulaUnit(event, P);
}

/**
 * Parse a time string like "4:11.30" into seconds (251.30),
 * or return a plain number as-is.
 */
export function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();

  // mm:ss.xx format
  const timeMatch = trimmed.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1], 10);
    const seconds = parseFloat(timeMatch[2]);
    return minutes * 60 + seconds;
  }

  // Plain number
  const num = parseFloat(trimmed);
  if (!isNaN(num) && num > 0) {
    return num;
  }

  return null;
}

/**
 * Format seconds into a display string.
 * For times >= 60 seconds, show as m:ss.xx
 */
export function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds - mins * 60;
    return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
  }
  return seconds.toFixed(2);
}

/**
 * Format a performance value for display based on event type.
 */
export function formatPerformance(event: EventDefinition, performance: number): string {
  if (event.type === 'track') {
    const time = formatTime(performance);
    return performance < 60 ? `${time}s` : time;
  }
  return `${performance.toFixed(2)}m`;
}
