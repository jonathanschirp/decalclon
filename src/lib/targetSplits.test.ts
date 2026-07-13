import { describe, it, expect } from 'vitest';
import type { Athlete, Competition, CompetitionResults } from '../types';
import { getEventById } from './events';
import { calculatePoints, pointsToMark } from './scoring';
import {
  buildTargetModel,
  clampToEvent,
  summarize,
  waterfill,
  type SummaryInput,
  type TargetModel,
} from './targetSplits';

const PBS: Record<string, number> = {
  dec_100m: 10.71,
  dec_long_jump: 7.76,
  dec_shot_put: 17.08,
  dec_high_jump: 2.05,
  dec_400m: 48.19,
  dec_110m_hurdles: 14.29,
  dec_discus: 55.75,
  dec_pole_vault: 4.8,
  dec_javelin: 65.12,
  dec_1500m: 285.3,
};

function athlete(): Athlete {
  return { id: 'a1', name: 'Test Athlete', gender: 'male', personalBests: PBS, combinedPB: 8961 } as Athlete;
}

// Day 1 (events 1–5) contested; day 2 (events 6–10) remaining.
function competition(): Competition {
  const results: CompetitionResults = {
    a1: { dec_100m: 10.71, dec_long_jump: 7.72, dec_shot_put: 16.34, dec_high_jump: 2.02, dec_400m: 47.8 },
  };
  return {
    id: 'c1', name: 'Test', date: '2026-06-03', type: 'decathlon',
    status: 'in_progress', athleteIds: ['a1'], results,
  } as Competition;
}

const model = (): TargetModel => buildTargetModel(competition(), athlete());

/** req map starting every remaining event at its PB (startPoints). */
function startReq(m: TargetModel): Record<string, number> {
  const o: Record<string, number> = {};
  for (const r of m.remaining) o[r.event.id] = r.startPoints;
  return o;
}

function sum(m: TargetModel, req: Record<string, number>, extra: Partial<SummaryInput> = {}) {
  return summarize({ model: m, req, mode: 'target', target: m.pbProjection, locks: {}, ...extra });
}

describe('pointsToMark — inverse of calculatePoints', () => {
  const cases = ['dec_100m', 'dec_javelin', 'dec_long_jump', 'dec_high_jump', 'dec_pole_vault'];
  it.each(cases)('round-trips %s within rounding', (id) => {
    const event = getEventById(id)!;
    const pts = calculatePoints(event, PBS[id]);
    const back = pointsToMark(event, pts);
    expect(Math.abs(calculatePoints(event, back) - pts)).toBeLessThanOrEqual(1);
  });
});

describe('buildTargetModel', () => {
  it('splits contested vs remaining, with a symmetric ±20% points band around each PB', () => {
    const m = model();
    expect(m.remaining.map((r) => r.event.id)).toEqual([
      'dec_110m_hurdles', 'dec_discus', 'dec_pole_vault', 'dec_javelin', 'dec_1500m',
    ]);
    for (const r of m.remaining) {
      expect(r.usePb).toBe(true);
      expect(r.floorPoints).toBe(Math.round(r.anchorPoints * 0.8));
      expect(r.ceilingPoints).toBe(Math.round(r.anchorPoints * 1.2));
      expect(r.startPoints).toBe(r.anchorPoints); // handle starts dead-centre
    }
    expect(m.pbProjection).toBe(m.banked + m.remaining.reduce((t, r) => t + r.anchorPoints, 0));
  });

  it('falls back to the average anchor when the athlete has no PB for a remaining event', () => {
    const noJav = { ...PBS };
    delete noJav.dec_javelin;
    const a = { ...athlete(), personalBests: noJav } as Athlete;
    const m = buildTargetModel(competition(), a);
    const jav = m.remaining.find((r) => r.event.id === 'dec_javelin')!;
    expect(jav.usePb).toBe(false);
    expect(jav.anchorPoints).toBe(800); // AVERAGE_POINTS
    expect(jav.floorPoints).toBe(640);
    expect(jav.ceilingPoints).toBe(960);
  });
});

describe('waterfill', () => {
  it('reaches the target sum when the bounds allow it', () => {
    const items = [
      { value: 100, min: 0, max: 200 },
      { value: 100, min: 0, max: 200 },
      { value: 100, min: 0, max: 200 },
    ];
    const out = waterfill(items, 450);
    expect(out.reduce((a, b) => a + b, 0)).toBe(450);
  });

  it('settles as close as possible and respects bounds when the target is out of range', () => {
    const items = [
      { value: 50, min: 0, max: 100 },
      { value: 50, min: 0, max: 100 },
    ];
    const out = waterfill(items, 500); // impossible — max total 200
    expect(out).toEqual([100, 100]);
  });
});

describe('summarize — explore mode', () => {
  it('projects banked + chosen marks and compares to combined PB', () => {
    const m = model();
    const req = startReq(m);
    const s = summarize({ model: m, req, mode: 'explore', target: 0, locks: {} });
    expect(s.projected).toBe(m.banked + m.remaining.reduce((t, r) => t + r.anchorPoints, 0));
    expect(s.projected).toBe(m.pbProjection);
    expect(s.combinedPB).toBe(8961);
    expect(s.vsCombinedPB).toBe(s.projected - 8961);
  });

  it('lowering a slider lowers the projected total (no redistribution)', () => {
    const m = model();
    const req = startReq(m);
    const jav = m.remaining.find((r) => r.event.id === 'dec_javelin')!;
    const before = sum(m, req, { mode: 'explore' }).projected;
    const lowered = { ...req, dec_javelin: jav.floorPoints };
    const after = summarize({ model: m, req: lowered, mode: 'explore', target: 0, locks: {} }).projected;
    expect(after).toBeLessThan(before);
  });
});

describe('summarize — status & verdict (target mode)', () => {
  it('marks at/below PB read comfortable, above PB read stretch', () => {
    const m = model();
    const jav = m.remaining.find((r) => r.event.id === 'dec_javelin')!;
    const req = { ...startReq(m), dec_javelin: jav.ceilingPoints };
    const s = sum(m, req);
    const row = s.rows.find((r) => r.event.id === 'dec_javelin')!;
    expect(row.status).toBe('stretch');
    const comfy = s.rows.find((r) => r.event.id === 'dec_discus')!;
    expect(comfy.status).toBe('comfortable');
  });

  it('a below-PB target is comfortable; an out-of-reach target is not reachable', () => {
    const m = model();
    const req = startReq(m);
    expect(sum(m, req, { target: m.pbProjection - 300 }).verdict).toBe('comfortable');
    expect(sum(m, req, { target: 20000 }).verdict).toBe('infeasible');
  });
});

describe('clampToEvent', () => {
  it('keeps points inside the event floor/ceiling range', () => {
    const m = model();
    const r = m.remaining[0];
    expect(clampToEvent(r, -100)).toBe(r.floorPoints);
    expect(clampToEvent(r, 99999)).toBe(r.ceilingPoints);
    expect(clampToEvent(r, r.anchorPoints)).toBe(r.anchorPoints);
  });
});
