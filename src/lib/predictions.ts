import type { Athlete, Competition, AthleteScore, EventDefinition } from '../types';
import { getEventsForType } from './events';
import { calculatePoints } from './scoring';

/** Sentinel value stored in results meaning DNS / DNF / DQ — no mark recorded. */
export const DNS_MARK = 0;

/** Check whether a result value represents a DNS/DNF/no-mark. */
export function isDNS(value: number | null | undefined): boolean {
  return value === DNS_MARK;
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

      // First pass: check if athlete has any DNS mark → withdrawn
      const athleteResults = competition.results?.[athleteId] ?? {};
      const withdrawn = Object.values(athleteResults).some((v) => isDNS(v));

      // Find the first DNS event index so we know where they dropped out
      let dnsEventIndex = events.length;
      if (withdrawn) {
        for (let i = 0; i < events.length; i++) {
          if (isDNS(athleteResults[events[i].id])) {
            dnsEventIndex = i;
            break;
          }
        }
      }

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
          // Explicit DNS — 0 points, no performance
          performance = null;
        } else if (isActual) {
          // Real result
          performance = actualResult;
          points = calculatePoints(event, actualResult);
        } else if (withdrawn && i >= dnsEventIndex) {
          // Past withdrawal point — no PB fill, 0 points
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

  for (const event of events) {
    const allCompleted = competition.athleteIds.every(
      (id) => competition.results?.[id]?.[event.id] != null,
    );
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
