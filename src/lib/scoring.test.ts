import { describe, it, expect } from 'vitest';
import { calculatePoints, parseTimeInput, formatTime } from './scoring';
import { getEventById } from './events';

describe('calculatePoints', () => {
  it('calculates 100m decathlon points correctly', () => {
    const event = getEventById('dec_100m')!;
    // 10.85s → INT(25.4347 × (18.0 − 10.85)^1.81) = 894
    expect(calculatePoints(event, 10.85)).toBe(894);
  });

  it('calculates long jump decathlon points correctly', () => {
    const event = getEventById('dec_long_jump')!;
    // 7.65m = 765cm → INT(0.14354 × (765 − 220)^1.4) = 972
    expect(calculatePoints(event, 7.65)).toBe(972);
  });

  it('calculates shot put decathlon points correctly', () => {
    const event = getEventById('dec_shot_put')!;
    // 16.0m → INT(51.39 × (16.0 − 1.5)^1.05) = 851
    expect(calculatePoints(event, 16.0)).toBe(851);
  });

  it('calculates high jump decathlon points (cm conversion)', () => {
    const event = getEventById('dec_high_jump')!;
    // 2.01m = 201cm → INT(0.8465 × (201 − 75)^1.42) = 813
    expect(calculatePoints(event, 2.01)).toBe(813);
  });

  it('calculates 400m decathlon points correctly', () => {
    const event = getEventById('dec_400m')!;
    // 46.72s → INT(1.53775 × (82.0 − 46.72)^1.81) = 972
    expect(calculatePoints(event, 46.72)).toBe(972);
  });

  it('calculates 110m hurdles points correctly', () => {
    const event = getEventById('dec_110m_hurdles')!;
    // 13.80s → INT(5.74352 × (28.5 − 13.8)^1.92) = 1000
    expect(calculatePoints(event, 13.80)).toBe(1000);
  });

  it('calculates pole vault points (cm conversion)', () => {
    const event = getEventById('dec_pole_vault')!;
    // 5.20m = 520cm → INT(0.2797 × (520 − 100)^1.35) = 972
    expect(calculatePoints(event, 5.20)).toBe(972);
  });

  it('calculates 1500m points correctly', () => {
    const event = getEventById('dec_1500m')!;
    // 251.30s → INT(0.03768 × (480.0 − 251.3)^1.85) = 872
    expect(calculatePoints(event, 251.3)).toBe(872);
  });

  it('returns 0 when track performance is worse than B', () => {
    const event = getEventById('dec_100m')!;
    expect(calculatePoints(event, 18.0)).toBe(0);
  });

  it('returns 0 when field performance is worse than B', () => {
    const event = getEventById('dec_shot_put')!;
    expect(calculatePoints(event, 1.0)).toBe(0);
  });

  it('calculates heptathlon 100m hurdles correctly', () => {
    const event = getEventById('hep_100m_hurdles')!;
    // 13.0s → INT(9.23076 × (26.7 − 13.0)^1.835) = 1124
    expect(calculatePoints(event, 13.0)).toBe(1124);
  });

  it('calculates heptathlon 800m correctly', () => {
    const event = getEventById('hep_800m')!;
    // 127.0s → INT(0.11193 × (254.0 − 127.0)^1.88) = 1009
    expect(calculatePoints(event, 127.0)).toBe(1009);
  });

  it('uses floor not round for points', () => {
    const event = getEventById('dec_100m')!;
    const points = calculatePoints(event, 10.85);
    expect(points).toBe(Math.floor(points));
  });

  // Known reference: Kevin Mayer's WR decathlon (9126 pts) individual events
  it('calculates a world-class 100m correctly', () => {
    const event = getEventById('dec_100m')!;
    // 10.55s is a strong decathlon 100m
    expect(calculatePoints(event, 10.55)).toBe(963);
  });
});

describe('parseTimeInput', () => {
  it('parses plain seconds', () => {
    expect(parseTimeInput('10.85')).toBe(10.85);
  });

  it('parses mm:ss.xx format', () => {
    expect(parseTimeInput('4:11.30')).toBeCloseTo(251.3);
  });

  it('parses 2:07.00', () => {
    expect(parseTimeInput('2:07.00')).toBeCloseTo(127.0);
  });

  it('returns null for invalid input', () => {
    expect(parseTimeInput('abc')).toBeNull();
    expect(parseTimeInput('-5')).toBeNull();
    expect(parseTimeInput('')).toBeNull();
  });
});

describe('formatTime', () => {
  it('formats seconds < 60', () => {
    expect(formatTime(10.85)).toBe('10.85');
  });

  it('formats seconds >= 60 as m:ss.xx', () => {
    expect(formatTime(251.3)).toBe('4:11.30');
  });

  it('pads seconds correctly', () => {
    expect(formatTime(127.0)).toBe('2:07.00');
  });
});
