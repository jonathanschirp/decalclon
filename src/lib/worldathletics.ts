import type { BestCombined, Gender, CompetitionType, CompetitionResults } from '../types';
import { parseTimeInput } from './scoring';

const GRAPHQL_ENDPOINT = 'https://worldathletics.stellate.sh/';

export interface WASearchResult {
  aaAthleteId: string;
  familyName: string;
  givenName: string;
  birthDate: string | null;
  disciplines: string;
  gender: string;
  country: string;
}

export interface WAPersonalBest {
  discipline: string;
  mark: string;
}

export interface WAAthleteProfile {
  name: string;
  birthDate: string | null;
  country: string;
  gender: string;
  personalBests: WAPersonalBest[];
}

// Maps World Athletics discipline names to our event IDs.
// Decathlon and heptathlon use the same WA discipline names, so we map
// per competition type to produce the correct prefixed event ID.
const DISCIPLINE_TO_EVENT: Record<string, { dec?: string; hep?: string }> = {
  '100 Metres':           { dec: 'dec_100m' },
  'Long Jump':            { dec: 'dec_long_jump', hep: 'hep_long_jump' },
  'Shot Put':             { dec: 'dec_shot_put', hep: 'hep_shot_put' },
  'High Jump':            { dec: 'dec_high_jump', hep: 'hep_high_jump' },
  '400 Metres':           { dec: 'dec_400m' },
  '110 Metres Hurdles':   { dec: 'dec_110m_hurdles' },
  'Discus Throw':         { dec: 'dec_discus' },
  'Pole Vault':           { dec: 'dec_pole_vault' },
  'Javelin Throw':        { dec: 'dec_javelin', hep: 'hep_javelin' },
  '1500 Metres':          { dec: 'dec_1500m' },
  '100 Metres Hurdles':   { hep: 'hep_100m_hurdles' },
  '200 Metres':           { hep: 'hep_200m' },
  '800 Metres':           { hep: 'hep_800m' },
};

async function graphql<T>(query: string): Promise<T> {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-graphql-client-name': 'worldathletics',
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`World Athletics API error: ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

export async function searchAthletes(name: string): Promise<WASearchResult[]> {
  const escaped = name.replace(/"/g, '\\"');
  const data = await graphql<{ searchCompetitors: WASearchResult[] }>(
    `{ searchCompetitors(query: "${escaped}") { aaAthleteId familyName givenName birthDate disciplines gender country } }`,
  );
  return data.searchCompetitors ?? [];
}

export async function fetchAthleteProfile(id: string): Promise<WAAthleteProfile> {
  const data = await graphql<{
    getSingleCompetitor: {
      basicData: { familyName: string; givenName: string; birthDate: string | null; countryCode: string; sexNameUrlSlug: string | null };
      personalBests: { results: WAPersonalBest[] } | null;
    };
  }>(
    `{ getSingleCompetitor(id: ${id}) { basicData { familyName givenName birthDate countryCode sexNameUrlSlug } personalBests { results { discipline mark } } } }`,
  );
  const { basicData, personalBests } = data.getSingleCompetitor;
  return {
    name: `${basicData.givenName} ${basicData.familyName}`,
    birthDate: basicData.birthDate,
    country: basicData.countryCode,
    gender: basicData.sexNameUrlSlug ?? '',
    personalBests: personalBests?.results ?? [],
  };
}

/**
 * Convert WA personal bests into our event ID → numeric value map.
 * Only includes standard disciplines that match our decathlon/heptathlon events.
 * Marks with "=" suffix (wind-assisted) or equipment variants like "(6kg)" are skipped.
 */
export function mapPersonalBests(
  waPBs: WAPersonalBest[],
  gender: Gender,
): Record<string, number> {
  const prefix = gender === 'male' ? 'dec' : 'hep';
  const result: Record<string, number> = {};

  for (const pb of waPBs) {
    // Skip equipment/age variants like "Shot Put (6kg)" and wind-assisted marks "6.85="
    if (pb.discipline.includes('(') || pb.mark.endsWith('=')) continue;

    const mapping = DISCIPLINE_TO_EVENT[pb.discipline];
    const eventId = mapping?.[prefix];
    if (!eventId || result[eventId] != null) continue;

    const parsed = parseTimeInput(pb.mark) ?? parseFloat(pb.mark);
    if (parsed != null && parsed > 0) {
      result[eventId] = parsed;
    }
  }

  return result;
}

/**
 * Extract the decathlon or heptathlon total PB from WA personal bests.
 */
export function extractCombinedPB(
  waPBs: WAPersonalBest[],
  gender: Gender,
): number | undefined {
  const discipline = gender === 'male' ? 'Decathlon' : 'Heptathlon';
  const pb = waPBs.find((p) => p.discipline === discipline);
  if (!pb) return undefined;
  const val = parseInt(pb.mark, 10);
  return val > 0 ? val : undefined;
}

// --- Competition API ---

export interface WACompetition {
  id: number;
  name: string;
  venue: string;
  startDate: string;
  endDate: string;
}

export interface WACombinedEvent {
  id: number;
  name: string;
  gender: string;
}

export interface WACompetitorResult {
  name: string;
  iaafId: number;
  nationality: string;
  details: { event: string; mark: string; points: number }[];
}

export async function searchCompetitions(query: string): Promise<WACompetition[]> {
  const escaped = query.replace(/"/g, '\\"');
  const data = await graphql<{
    getCalendarEvents: { results: WACompetition[] };
  }>(
    `{ getCalendarEvents(query: "${escaped}", regionType: "world", hideCompetitionsWithNoResults: false) { results { id name venue startDate endDate } } }`,
  );
  return data.getCalendarEvents?.results ?? [];
}

export async function fetchCombinedEvents(competitionId: number): Promise<WACombinedEvent[]> {
  const data = await graphql<{
    getCalendarCompetitionResults: {
      options: { events: { id: number; name: string; gender: string; combined: boolean | null }[] };
    };
  }>(
    `{ getCalendarCompetitionResults(competitionId: ${competitionId}, day: null, eventId: null) { options { events { id name gender combined } } } }`,
  );
  return (data.getCalendarCompetitionResults?.options?.events ?? [])
    .filter((e) => e.combined === true)
    .map(({ id, name, gender }) => ({ id, name, gender }));
}

export async function fetchEventResults(
  competitionId: number,
  eventId: number,
): Promise<WACompetitorResult[]> {
  const data = await graphql<{
    getCalendarCompetitionResults: {
      eventTitles: {
        events: {
          races: {
            results: {
              competitor: { name: string; iaafId: number };
              nationality: string;
              details: { event: string; mark: string; points: number }[] | null;
            }[];
          }[];
        }[];
      }[];
    };
  }>(
    `{ getCalendarCompetitionResults(competitionId: ${competitionId}, day: null, eventId: ${eventId}) { eventTitles { events { races { results { competitor { name iaafId } nationality details { event mark points } } } } } } }`,
  );

  const titles = data.getCalendarCompetitionResults?.eventTitles ?? [];
  const results: WACompetitorResult[] = [];
  for (const title of titles) {
    for (const evt of title.events ?? []) {
      for (const race of evt.races ?? []) {
        for (const r of race.results ?? []) {
          results.push({
            name: r.competitor.name,
            iaafId: r.competitor.iaafId,
            nationality: r.nationality,
            details: r.details ?? [],
          });
        }
      }
    }
  }
  return results;
}

export interface WAStartListEntry {
  name: string;
  country: string;
}

/**
 * Fetch the start list for a combined event.
 * Returns athletes listed in the start list, or empty if none published.
 */
export async function fetchStartList(
  competitionId: number,
  eventId: number,
): Promise<WAStartListEntry[]> {
  const data = await graphql<{
    getCalendarCompetitionResults: {
      eventTitles: {
        events: {
          races: {
            startList: { competitor: { name: string; country: string } }[] | null;
          }[];
        }[];
      }[];
    };
  }>(
    `{ getCalendarCompetitionResults(competitionId: ${competitionId}, day: null, eventId: ${eventId}) { eventTitles { events { races { startList { competitor { name country } } } } } } }`,
  );

  const entries: WAStartListEntry[] = [];
  const titles = data.getCalendarCompetitionResults?.eventTitles ?? [];
  for (const title of titles) {
    for (const evt of title.events ?? []) {
      for (const race of evt.races ?? []) {
        for (const s of race.startList ?? []) {
          entries.push({ name: s.competitor.name, country: s.competitor.country });
        }
      }
    }
  }
  return entries;
}

/**
 * Maps the short discipline names used in competition result details
 * to our event IDs. These differ from the full names in personal bests.
 */
const RESULT_DISCIPLINE_TO_EVENT: Record<string, { dec?: string; hep?: string }> = {
  '100m':          { dec: 'dec_100m' },
  'Long Jump':     { dec: 'dec_long_jump', hep: 'hep_long_jump' },
  'Shot Put':      { dec: 'dec_shot_put', hep: 'hep_shot_put' },
  'High Jump':     { dec: 'dec_high_jump', hep: 'hep_high_jump' },
  '400m':          { dec: 'dec_400m' },
  '110mH':         { dec: 'dec_110m_hurdles' },
  'Discus Throw':  { dec: 'dec_discus' },
  'Pole Vault':    { dec: 'dec_pole_vault' },
  'Javelin Throw': { dec: 'dec_javelin', hep: 'hep_javelin' },
  '1500m':         { dec: 'dec_1500m' },
  '100mH':         { hep: 'hep_100m_hurdles' },
  '200m':          { hep: 'hep_200m' },
  '800m':          { hep: 'hep_800m' },
};

/**
 * Convert WA competition results into our CompetitionResults format.
 * Requires a mapping from WA iaafId to our athlete DB ID.
 */
export function mapEventResults(
  waResults: WACompetitorResult[],
  type: CompetitionType,
  iaafIdToAthleteId: Record<string, string>,
): CompetitionResults {
  const prefix = type === 'decathlon' ? 'dec' : 'hep';
  const results: CompetitionResults = {};

  for (const competitor of waResults) {
    const athleteId = iaafIdToAthleteId[String(competitor.iaafId)];
    if (!athleteId) continue;

    results[athleteId] = {};
    for (const detail of competitor.details) {
      const mapping = RESULT_DISCIPLINE_TO_EVENT[detail.event];
      const eventId = mapping?.[prefix];
      if (!eventId) continue;

      const parsed = parseTimeInput(detail.mark) ?? parseFloat(detail.mark);
      if (parsed != null && parsed > 0) {
        results[athleteId][eventId] = parsed;
      }
    }
  }

  return results;
}

/**
 * Determine the competition type from a WA combined event name.
 */
export function competitionTypeFromEvent(event: WACombinedEvent): CompetitionType {
  return event.name.toLowerCase().includes('heptathlon') ? 'heptathlon' : 'decathlon';
}

// --- Best combined event (all-time PB decathlon/heptathlon breakdown) ---

export interface WATop10Result {
  discipline: string;
  /** Total points for the performance, as a string, e.g. "8961". */
  result: string;
  date: string;
  competition: string;
  competitionId: string;
  eventId: string;
}

export interface BestCombinedRef {
  total: number;
  date: string;
  competition: string;
  competitionId: string;
  eventId: string;
}

/** Fetch an athlete's all-time top-10 performances across their disciplines. */
export async function fetchAllTimeTop10(waAthleteId: string): Promise<WATop10Result[]> {
  const data = await graphql<{
    getSingleCompetitorAllTimePersonalTop10: { results: WATop10Result[] } | null;
  }>(
    `{ getSingleCompetitorAllTimePersonalTop10(id: ${waAthleteId}) { results { discipline result date competition competitionId eventId } } }`,
  );
  return data.getSingleCompetitorAllTimePersonalTop10?.results ?? [];
}

/**
 * Pick the best (highest total) result for a given combined-event discipline
 * ("Decathlon" or "Heptathlon") from an all-time top-10 list.
 */
export function selectBestCombined(
  results: WATop10Result[],
  discipline: string,
): BestCombinedRef | null {
  let best: BestCombinedRef | null = null;
  for (const r of results) {
    if (r.discipline !== discipline) continue;
    const total = parseInt(r.result, 10);
    if (!Number.isFinite(total) || total <= 0) continue;
    if (!best || total > best.total) {
      best = { total, date: r.date, competition: r.competition, competitionId: r.competitionId, eventId: r.eventId };
    }
  }
  return best;
}

/**
 * Map a single competitor's combined-event detail marks into our event-ID keyed
 * marks + points (the single-competitor analogue of {@link mapEventResults}).
 */
export function mapCombinedDetails(
  details: { event: string; mark: string; points: number }[],
  type: CompetitionType,
): { marks: Record<string, number>; points: Record<string, number> } {
  const prefix = type === 'decathlon' ? 'dec' : 'hep';
  const marks: Record<string, number> = {};
  const points: Record<string, number> = {};
  for (const d of details) {
    const eventId = RESULT_DISCIPLINE_TO_EVENT[d.event]?.[prefix];
    if (!eventId) continue;
    const parsed = parseTimeInput(d.mark) ?? parseFloat(d.mark);
    if (parsed != null && parsed > 0) {
      marks[eventId] = parsed;
      points[eventId] = d.points;
    }
  }
  return { marks, points };
}

/** Case/order-insensitive name key for matching WA competitor rows. */
function nameKey(name: string): string {
  return name.toUpperCase().split(/\s+/).filter(Boolean).sort().join(' ');
}

/**
 * Find the athlete's row within a competition's results. Result rows key on
 * `iaafId` (which differs from the profile aaAthleteId), so match by name, then
 * fall back to the row whose detail points sum equals the known total.
 */
function matchCompetitor(
  results: WACompetitorResult[],
  athleteName: string,
  total: number,
): WACompetitorResult | null {
  const key = nameKey(athleteName);
  const byName = results.find((r) => nameKey(r.name) === key);
  if (byName) return byName;
  return results.find((r) => (r.details ?? []).reduce((s, d) => s + (d.points || 0), 0) === total) ?? null;
}

/**
 * Fetch and assemble an athlete's best-ever decathlon/heptathlon breakdown:
 * their all-time best total plus that meet's individual event marks and points.
 * Returns null when the athlete has no such result on record.
 */
export async function fetchBestCombinedResult(
  waAthleteId: string,
  type: CompetitionType,
  athleteName: string,
): Promise<BestCombined | null> {
  const discipline = type === 'decathlon' ? 'Decathlon' : 'Heptathlon';
  const best = selectBestCombined(await fetchAllTimeTop10(waAthleteId), discipline);
  if (!best) return null;

  const results = await fetchEventResults(Number(best.competitionId), Number(best.eventId));
  const row = matchCompetitor(results, athleteName, best.total);
  if (!row) return null;

  const { marks, points } = mapCombinedDetails(row.details, type);
  if (Object.keys(marks).length === 0) return null;

  return { total: best.total, date: best.date, competition: best.competition, marks, points };
}

/**
 * Extract venue location from WA venue string.
 * "Mösle-Stadium, Götzis (AUT)" → "Götzis (AUT)"
 */
export function parseVenue(venue: string): string {
  const parts = venue.split(',');
  return parts.length > 1 ? parts.slice(1).join(',').trim() : venue;
}
