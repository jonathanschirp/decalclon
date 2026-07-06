import type { Athlete, Competition, AthleteScore, EventDefinition } from '../types';
import { getEventsForType } from './events';
import { calculatePoints } from './scoring';

/** Sentinel value stored in results meaning no valid mark (fall, foul, DNF/DNS) — 0 points. */
export const DNS_MARK = 0;

/** Check whether a result value represents a no-mark (0-point) result. */
export function isDNS(value: number | null | undefined): boolean {
  return value === DNS_MARK;
}

interface MarkBounds {
  /** Highest event index with a real (non-no-mark) result, or -1. */
  lastRealIndex: number;
  /** Highest event index with any result (real or no-mark), or -1. */
  lastMarkIndex: number;
  /**
   * Whether the athlete has dropped out: their most recent entry is a no-mark
   * with no real result after it. Entering a later result reactivates them.
   */
  withdrawn: boolean;
}

/** Derive an athlete's mark bounds and withdrawal state from their results. */
function getMarkBounds(
  athleteResults: Record<string, number | null>,
  events: EventDefinition[],
): MarkBounds {
  let lastRealIndex = -1;
  let lastMarkIndex = -1;
  for (let i = 0; i < events.length; i++) {
    const v = athleteResults[events[i].id];
    if (v == null) continue;
    lastMarkIndex = i;
    if (!isDNS(v)) lastRealIndex = i;
  }
  return { lastRealIndex, lastMarkIndex, withdrawn: lastMarkIndex > lastRealIndex };
}

export function calculatePredictedScores(
  competition: Competition,
  athletes: Athlete[],
): AthleteScore[] {
  const events = getEventsForType(competition.type);
  const athleteMap = new Map(athletes.map((a) => [a.id, a]));

  const scores: AthleteScore[] = competition.athleteIds
    .map((athleteId) => {
      const athlete = athleteMap.get(athleteId);
      if (!athlete) return null;

      const athleteResults = competition.results?.[athleteId] ?? {};
      const { lastRealIndex, withdrawn } = getMarkBounds(athleteResults, events);

      const eventScores: AthleteScore['eventScores'] = {};
      let totalActualPoints = 0;
      let predictedFinalScore = 0;

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const actualResult = athleteResults[event.id];
        const isActual = actualResult != null;
        const dns = isDNS(actualResult);

        let performance: number | null;
        let points = 0;

        if (dns) {
          // No valid mark — 0 points, no performance
          performance = null;
        } else if (isActual) {
          // Real result
          performance = actualResult;
          points = calculatePoints(event, actualResult);
        } else if (withdrawn && i > lastRealIndex) {
          // Athlete abandoned — no PB fill past their last real mark
          performance = null;
        } else {
          // No result yet — fill with PB for prediction
          performance = athlete.personalBests[event.id] ?? null;
          if (performance != null) {
            points = calculatePoints(event, performance);
          }
        }

        eventScores[event.id] = { performance, points, isActual, isDNS: dns };

        if (isActual && !dns) {
          totalActualPoints += points;
        }
        predictedFinalScore += points;
      }

      return {
        athleteId,
        athleteName: athlete.name,
        eventScores,
        totalActualPoints,
        predictedFinalScore,
        position: 0,
        withdrawn,
      };
    })
    .filter((s): s is AthleteScore => s !== null);

  // Sort: active athletes first by score, then withdrawn at the bottom by score
  scores.sort((a, b) => {
    if (a.withdrawn !== b.withdrawn) return a.withdrawn ? 1 : -1;
    return b.predictedFinalScore - a.predictedFinalScore;
  });

  // Assign positions — withdrawn athletes get 0 (no position)
  let pos = 1;
  scores.forEach((score) => {
    score.position = score.withdrawn ? 0 : pos++;
  });

  return scores;
}

export function getCurrentEvent(
  competition: Competition,
): EventDefinition | null {
  const events = getEventsForType(competition.type);

  // How far each athlete is still expected to compete. A withdrawn athlete owes
  // no result past their drop-out event, so their missing later entries must not
  // hold back the current-event detection.
  const dropIndex = new Map<string, number>();
  for (const id of competition.athleteIds) {
    const results = competition.results?.[id] ?? {};
    const { withdrawn, lastMarkIndex } = getMarkBounds(results, events);
    dropIndex.set(id, withdrawn ? lastMarkIndex : events.length - 1);
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const allCompleted = competition.athleteIds.every((id) => {
      if (competition.results?.[id]?.[event.id] != null) return true;
      // Missing result is only acceptable if the athlete dropped out earlier.
      return i > (dropIndex.get(id) ?? events.length - 1);
    });
    if (!allCompleted) return event;
  }

  return null;
}

export function isPersonalBest(
  athlete: Athlete,
  eventId: string,
  performance: number,
  event: EventDefinition,
): boolean {
  const pb = athlete.personalBests[eventId];
  if (pb == null) return true;
  return event.higherIsBetter ? performance > pb : performance < pb;
}
