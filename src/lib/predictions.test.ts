import { describe, it, expect } from 'vitest';
import type { Athlete, Competition, CompetitionResults } from '../types';
import { calculatePredictedScores, getCurrentEvent, DNS_MARK } from './predictions';

const PBS: Record<string, number> = {
  dec_100m: 10.6,
  dec_long_jump: 7.5,
  dec_shot_put: 15.0,
  dec_high_jump: 2.0,
  dec_400m: 48.0,
  dec_110m_hurdles: 14.0,
  dec_discus: 45.0,
  dec_pole_vault: 5.0,
  dec_javelin: 60.0,
  dec_1500m: 270,
};

function athlete(): Athlete {
  return {
    id: 'a1',
    name: 'Test Athlete',
    gender: 'male',
    personalBests: PBS,
  } as Athlete;
}

function competition(results: CompetitionResults): Competition {
  return {
    id: 'c1',
    name: 'Test',
    date: '2026-06-03',
    type: 'decathlon',
    status: 'in_progress',
    athleteIds: ['a1'],
    results,
  } as Competition;
}

function scoreFor(results: CompetitionResults) {
  return calculatePredictedScores(competition(results), [athlete()])[0];
}

describe('calculatePredictedScores — no-mark handling', () => {
  it('a no-mark scores 0 for that event but keeps the rest PB-filled when a later result follows', () => {
    const s = scoreFor({
      a1: {
        dec_100m: 10.8,
        dec_long_jump: DNS_MARK, // failed long jump
        dec_shot_put: 14.5, // ...but continued
      },
    });

    expect(s.withdrawn).toBe(false);
    expect(s.eventScores.dec_long_jump.isDNS).toBe(true);
    expect(s.eventScores.dec_long_jump.points).toBe(0);
    // Events after the last real mark are still projected from PB
    expect(s.eventScores.dec_high_jump.points).toBeGreaterThan(0);
    expect(s.eventScores.dec_high_jump.isActual).toBe(false);
    // Prediction exceeds banked points because of the PB fill
    expect(s.predictedFinalScore).toBeGreaterThan(s.totalActualPoints);
  });

  it('a trailing no-mark withdraws the athlete and zeroes the remaining events', () => {
    const s = scoreFor({
      a1: {
        dec_100m: 10.8,
        dec_long_jump: 7.2,
        dec_shot_put: DNS_MARK, // abandoned here, nothing after
      },
    });

    expect(s.withdrawn).toBe(true);
    expect(s.eventScores.dec_shot_put.points).toBe(0);
    // No PB fill past the last real mark
    expect(s.eventScores.dec_high_jump.points).toBe(0);
    expect(s.eventScores.dec_1500m.points).toBe(0);
    // Predicted total collapses to actual banked points
    expect(s.predictedFinalScore).toBe(s.totalActualPoints);
  });

  it('reactivates a previously-abandoned athlete once a later result is entered', () => {
    const abandoned = scoreFor({
      a1: { dec_100m: 10.8, dec_long_jump: DNS_MARK },
    });
    expect(abandoned.withdrawn).toBe(true);

    const resumed = scoreFor({
      a1: { dec_100m: 10.8, dec_long_jump: DNS_MARK, dec_shot_put: 14.5 },
    });
    expect(resumed.withdrawn).toBe(false);
    expect(resumed.predictedFinalScore).toBeGreaterThan(abandoned.predictedFinalScore);
  });
});

describe('getCurrentEvent — withdrawn athletes', () => {
  function comp(results: CompetitionResults, athleteIds: string[]): Competition {
    return {
      id: 'c1',
      name: 'Test',
      date: '2026-06-03',
      type: 'decathlon',
      status: 'in_progress',
      athleteIds,
      results,
    } as Competition;
  }

  it('does not block on a withdrawn athlete who has no result for later events', () => {
    // a1 abandoned after long jump (no-mark); a2 and a3 have completed through shot put.
    const current = getCurrentEvent(
      comp(
        {
          a1: { dec_100m: 10.9, dec_long_jump: DNS_MARK },
          a2: { dec_100m: 10.7, dec_long_jump: 7.6, dec_shot_put: 15.1 },
          a3: { dec_100m: 10.8, dec_long_jump: 7.4, dec_shot_put: 14.9 },
        },
        ['a1', 'a2', 'a3'],
      ),
    );
    // Should advance past shot put (which a1 never entered) to high jump.
    expect(current?.id).toBe('dec_high_jump');
  });

  it('still stops at the earliest event an active athlete is missing', () => {
    const current = getCurrentEvent(
      comp(
        {
          a1: { dec_100m: 10.9, dec_long_jump: DNS_MARK },
          a2: { dec_100m: 10.7, dec_long_jump: 7.6 }, // active, owes shot put
          a3: { dec_100m: 10.8, dec_long_jump: 7.4, dec_shot_put: 14.9 },
        },
        ['a1', 'a2', 'a3'],
      ),
    );
    expect(current?.id).toBe('dec_shot_put');
  });
});
