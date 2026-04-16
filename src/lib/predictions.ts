import type { Athlete, Competition, AthleteScore, EventDefinition } from '../types';
import { getEventsForType } from './events';
import { calculatePoints } from './scoring';

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

      const eventScores: AthleteScore['eventScores'] = {};
      let totalActualPoints = 0;
      let predictedFinalScore = 0;

      for (const event of events) {
        const actualResult = competition.results?.[athleteId]?.[event.id];
        const isActual = actualResult != null;
        const performance = isActual ? actualResult : (athlete.personalBests[event.id] ?? null);

        let points = 0;
        if (performance != null) {
          points = calculatePoints(event, performance);
        }

        eventScores[event.id] = { performance, points, isActual };

        if (isActual) {
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
      };
    })
    .filter((s): s is AthleteScore => s !== null);

  // Sort by predicted final score descending
  scores.sort((a, b) => b.predictedFinalScore - a.predictedFinalScore);

  // Assign positions
  scores.forEach((score, index) => {
    score.position = index + 1;
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
