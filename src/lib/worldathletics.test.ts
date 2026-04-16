import { describe, it, expect } from 'vitest';
import { mapPersonalBests, extractCombinedPB, mapEventResults, type WAPersonalBest, type WACompetitorResult } from './worldathletics';

// Kevin Mayer's PBs as returned by the World Athletics API
const MAYER_PBS: WAPersonalBest[] = [
  { discipline: '60 Metres', mark: '6.85' },
  { discipline: '60 Metres', mark: '6.85=' },
  { discipline: '100 Metres', mark: '10.50' },
  { discipline: '200 Metres', mark: '21.76' },
  { discipline: '400 Metres', mark: '48.26' },
  { discipline: '1500 Metres', mark: '4:18.04' },
  { discipline: '110 Metres Hurdles', mark: '13.54' },
  { discipline: '110 Metres Hurdles', mark: '13.49' },
  { discipline: '110 Metres Hurdles (99.0cm)', mark: '14.09' },
  { discipline: 'High Jump', mark: '2.10' },
  { discipline: 'High Jump', mark: '2.10=' },
  { discipline: 'Pole Vault', mark: '5.60' },
  { discipline: 'Long Jump', mark: '7.80' },
  { discipline: 'Long Jump', mark: '7.80=' },
  { discipline: 'Shot Put', mark: '17.08' },
  { discipline: 'Shot Put (6kg)', mark: '14.68' },
  { discipline: 'Discus Throw', mark: '52.38' },
  { discipline: 'Discus Throw (1,75kg)', mark: '42.99' },
  { discipline: 'Javelin Throw', mark: '73.09' },
  { discipline: 'Decathlon', mark: '9126' },
];

describe('mapPersonalBests', () => {
  it('maps decathlon PBs correctly for male athlete', () => {
    const result = mapPersonalBests(MAYER_PBS, 'male');

    expect(result).toEqual({
      dec_100m: 10.50,
      dec_400m: 48.26,
      dec_1500m: expect.closeTo(258.04),
      dec_110m_hurdles: 13.54,
      dec_high_jump: 2.10,
      dec_pole_vault: 5.60,
      dec_long_jump: 7.80,
      dec_shot_put: 17.08,
      dec_discus: 52.38,
      dec_javelin: 73.09,
    });
  });

  it('skips wind-assisted marks (ending with =)', () => {
    const result = mapPersonalBests(MAYER_PBS, 'male');
    // Should use 13.54 (first non-assisted), not 13.49 (second entry)
    expect(result.dec_110m_hurdles).toBe(13.54);
  });

  it('skips equipment variants like (6kg)', () => {
    const result = mapPersonalBests(MAYER_PBS, 'male');
    expect(result.dec_shot_put).toBe(17.08);
  });

  it('does not include non-combined disciplines like 60m', () => {
    const result = mapPersonalBests(MAYER_PBS, 'male');
    expect(Object.keys(result).every((k) => k.startsWith('dec_'))).toBe(true);
  });

  it('maps heptathlon PBs for female athlete', () => {
    const hepPBs: WAPersonalBest[] = [
      { discipline: '100 Metres Hurdles', mark: '12.54' },
      { discipline: 'High Jump', mark: '1.98' },
      { discipline: 'Shot Put', mark: '15.77' },
      { discipline: '200 Metres', mark: '23.10' },
      { discipline: 'Long Jump', mark: '6.85' },
      { discipline: 'Javelin Throw', mark: '58.20' },
      { discipline: '800 Metres', mark: '2:10.00' },
    ];

    const result = mapPersonalBests(hepPBs, 'female');

    expect(result).toEqual({
      hep_100m_hurdles: 12.54,
      hep_high_jump: 1.98,
      hep_shot_put: 15.77,
      hep_200m: 23.10,
      hep_long_jump: 6.85,
      hep_javelin: 58.20,
      hep_800m: expect.closeTo(130.0),
    });
  });

  it('uses first occurrence when discipline appears multiple times', () => {
    const pbs: WAPersonalBest[] = [
      { discipline: '110 Metres Hurdles', mark: '13.54' },
      { discipline: '110 Metres Hurdles', mark: '13.49' },
    ];
    const result = mapPersonalBests(pbs, 'male');
    expect(result.dec_110m_hurdles).toBe(13.54);
  });
});

describe('extractCombinedPB', () => {
  it('extracts decathlon PB for male athlete', () => {
    expect(extractCombinedPB(MAYER_PBS, 'male')).toBe(9126);
  });

  it('returns undefined when no combined PB exists', () => {
    const pbs: WAPersonalBest[] = [{ discipline: '100 Metres', mark: '10.50' }];
    expect(extractCombinedPB(pbs, 'male')).toBeUndefined();
  });

  it('extracts heptathlon PB for female athlete', () => {
    const pbs: WAPersonalBest[] = [{ discipline: 'Heptathlon', mark: '7291' }];
    expect(extractCombinedPB(pbs, 'female')).toBe(7291);
  });
});

// Damian Warner's Gotzis 2024 results (partial)
const WARNER_RESULTS: WACompetitorResult = {
  name: 'Damian WARNER',
  iaafId: 263031,
  nationality: 'CAN',
  details: [
    { event: '100m', mark: '10.20', points: 1047 },
    { event: 'Long Jump', mark: '7.80', points: 1010 },
    { event: 'Shot Put', mark: '14.55', points: 762 },
    { event: 'High Jump', mark: '2.03', points: 831 },
    { event: '400m', mark: '47.46', points: 935 },
    { event: '110mH', mark: '13.45', points: 1047 },
    { event: 'Discus Throw', mark: '46.41', points: 796 },
    { event: 'Pole Vault', mark: '4.80', points: 849 },
    { event: 'Javelin Throw', mark: '57.53', points: 701 },
    { event: '1500m', mark: '4:36.94', points: 700 },
  ],
};

describe('mapEventResults', () => {
  const iaafMap = { '263031': 'athlete-db-id-1' };

  it('maps all decathlon discipline results correctly', () => {
    const results = mapEventResults([WARNER_RESULTS], 'decathlon', iaafMap);

    expect(results['athlete-db-id-1']).toEqual({
      dec_100m: 10.20,
      dec_long_jump: 7.80,
      dec_shot_put: 14.55,
      dec_high_jump: 2.03,
      dec_400m: 47.46,
      dec_110m_hurdles: 13.45,
      dec_discus: 46.41,
      dec_pole_vault: 4.80,
      dec_javelin: 57.53,
      dec_1500m: expect.closeTo(276.94),
    });
  });

  it('skips athletes not in the iaafId map', () => {
    const results = mapEventResults([WARNER_RESULTS], 'decathlon', {});
    expect(Object.keys(results)).toHaveLength(0);
  });

  it('handles partial results (mid-competition)', () => {
    const partial: WACompetitorResult = {
      ...WARNER_RESULTS,
      details: WARNER_RESULTS.details.slice(0, 3),
    };
    const results = mapEventResults([partial], 'decathlon', iaafMap);
    expect(Object.keys(results['athlete-db-id-1'])).toHaveLength(3);
    expect(results['athlete-db-id-1'].dec_100m).toBe(10.20);
  });

  it('maps heptathlon results with correct prefixes', () => {
    const hepResult: WACompetitorResult = {
      name: 'Test ATHLETE',
      iaafId: 999,
      nationality: 'TST',
      details: [
        { event: '100mH', mark: '12.54', points: 1100 },
        { event: 'High Jump', mark: '1.98', points: 1050 },
        { event: '200m', mark: '23.10', points: 980 },
        { event: '800m', mark: '2:10.00', points: 900 },
      ],
    };
    const results = mapEventResults([hepResult], 'heptathlon', { '999': 'hep-athlete-1' });

    expect(results['hep-athlete-1']).toEqual({
      hep_100m_hurdles: 12.54,
      hep_high_jump: 1.98,
      hep_200m: 23.10,
      hep_800m: expect.closeTo(130.0),
    });
  });
});
