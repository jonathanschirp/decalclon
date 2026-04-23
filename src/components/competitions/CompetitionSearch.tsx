import { useState, useRef, useEffect } from 'react';
import type { CompetitionType, CompetitionResults } from '../../types';
import {
  searchCompetitions,
  fetchCombinedEvents,
  fetchEventResults,
  fetchStartList,
  fetchAthleteProfile,
  mapPersonalBests,
  extractCombinedPB,
  mapEventResults,
  competitionTypeFromEvent,
  parseVenue,
  searchAthletes,
  type WACompetition,
  type WACombinedEvent,
  type WACompetitorResult,
} from '../../lib/worldathletics';
import { useAthletes } from '../../hooks/useAthletes';

export interface CompetitionImportData {
  name: string;
  date: string;
  location: string;
  type: CompetitionType;
  waCompetitionId: number;
  waEventId: number;
  athleteIds: string[];
  waAthleteMap: Record<string, string>;
  results: CompetitionResults;
}

interface Props {
  query: string;
  disabled?: boolean;
  onImport: (data: CompetitionImportData) => void;
}

type Step = 'search' | 'events' | 'athletes' | 'importing' | 'metadata-only';

interface AthleteRow {
  name: string;
  nationality: string;
  iaafId: number;
  existingId: string | null;
  selected: boolean;
}

const DEBOUNCE_MS = 600;

export function CompetitionSearch({ query, disabled, onImport }: Props) {
  const { athletes: dbAthletes, create: createAthlete, fetch: refreshAthletes } = useAthletes();

  const [step, setStep] = useState<Step>('search');
  const [competitions, setCompetitions] = useState<WACompetition[]>([]);
  const [selectedComp, setSelectedComp] = useState<WACompetition | null>(null);
  const [combinedEvents, setCombinedEvents] = useState<WACombinedEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<WACombinedEvent | null>(null);
  const [athleteRows, setAthleteRows] = useState<AthleteRow[]>([]);
  const [waResults, setWaResults] = useState<WACompetitorResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchRef = useRef('');

  // Clear results when disabled
  useEffect(() => {
    if (disabled) {
      setCompetitions([]);
      setError('');
      setSearching(false);
      setStep('search');
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, [disabled]);

  // Auto-search with debounce when query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (disabled) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setCompetitions([]);
      setError('');
      setStep('search');
      lastSearchRef.current = '';
      return;
    }

    if (trimmed === lastSearchRef.current) return;

    setSearching(true);

    debounceRef.current = setTimeout(async () => {
      lastSearchRef.current = trimmed;
      setError('');
      setCompetitions([]);
      setStep('search');
      try {
        const results = await searchCompetitions(trimmed);
        setCompetitions(results);
        if (results.length === 0) setError('No competitions found on World Athletics.');
      } catch {
        setError('Search failed. The World Athletics API may be unavailable.');
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, disabled]);

  const handleSelectCompetition = async (comp: WACompetition) => {
    setSelectedComp(comp);
    setLoading(true);
    setError('');
    setCompetitions([]);
    try {
      const events = await fetchCombinedEvents(comp.id);
      if (events.length === 0) {
        setStep('metadata-only');
        setLoading(false);
        return;
      }
      setCombinedEvents(events);
      if (events.length === 1) {
        await handleSelectEvent(comp, events[0]);
      } else {
        setStep('events');
        setLoading(false);
      }
    } catch {
      setStep('metadata-only');
      setLoading(false);
    }
  };

  const handleSelectEvent = async (comp: WACompetition, event: WACombinedEvent) => {
    setSelectedEvent(event);
    setLoading(true);
    setError('');
    try {
      const results = await fetchEventResults(comp.id, event.id);

      let rows: AthleteRow[];

      if (results.length > 0) {
        setWaResults(results);
        rows = results.map((r) => {
          let existingId: string | null = null;
          for (const a of dbAthletes) {
            if (a.name.toLowerCase() === formatWAName(r.name).toLowerCase()) {
              existingId = a.id;
              break;
            }
          }
          return {
            name: formatWAName(r.name),
            nationality: r.nationality,
            iaafId: r.iaafId,
            existingId,
            selected: true,
          };
        });
      } else {
        const startList = await fetchStartList(comp.id, event.id);
        if (startList.length > 0) {
          setWaResults([]);
          rows = startList.map((s, i) => {
            const name = formatWAName(s.name);
            let existingId: string | null = null;
            for (const a of dbAthletes) {
              if (a.name.toLowerCase() === name.toLowerCase()) {
                existingId = a.id;
                break;
              }
            }
            return {
              name,
              nationality: s.country,
              iaafId: -(i + 1),
              existingId,
              selected: true,
            };
          });
        } else {
          setStep('metadata-only');
          setLoading(false);
          return;
        }
      }

      setAthleteRows(rows);
      setStep('athletes');
    } catch {
      setStep('metadata-only');
    } finally {
      setLoading(false);
    }
  };

  const handleMetadataImport = (type: CompetitionType) => {
    if (!selectedComp) return;
    onImport({
      name: selectedComp.name,
      date: selectedComp.startDate,
      location: parseVenue(selectedComp.venue),
      type,
      waCompetitionId: selectedComp.id,
      waEventId: 0,
      athleteIds: [],
      waAthleteMap: {},
      results: {},
    });
  };

  const handleImport = async () => {
    if (!selectedComp || !selectedEvent) return;
    setStep('importing');
    setError('');

    const type = competitionTypeFromEvent(selectedEvent);
    const gender = type === 'decathlon' ? 'male' : 'female';
    const selected = athleteRows.filter((r) => r.selected);
    const iaafIdToAthleteId: Record<string, string> = {};
    const athleteIds: string[] = [];

    try {
      for (let i = 0; i < selected.length; i++) {
        const row = selected[i];

        if (row.existingId) {
          iaafIdToAthleteId[String(row.iaafId)] = row.existingId;
          athleteIds.push(row.existingId);
          continue;
        }

        setImportProgress(`Creating athlete ${i + 1}/${selected.length}: ${row.name}`);

        let waAthleteId: string | undefined;
        let combinedPB: number | undefined;
        let pbs: Record<string, number> = {};

        try {
          const searchResults = await searchAthletes(row.name);
          const match = searchResults.find(
            (s) => s.country === row.nationality,
          ) ?? searchResults[0];

          if (match) {
            waAthleteId = match.aaAthleteId;
            const profile = await fetchAthleteProfile(match.aaAthleteId);
            pbs = mapPersonalBests(profile.personalBests, gender);
            combinedPB = extractCombinedPB(profile.personalBests, gender);
          }
        } catch {
          // If WA lookup fails, create athlete without PBs
        }

        const id = await createAthlete({
          name: row.name,
          gender,
          nationality: row.nationality,
          personalBests: pbs,
          ...(combinedPB != null && { combinedPB }),
          ...(waAthleteId != null && { waAthleteId }),
        });

        iaafIdToAthleteId[String(row.iaafId)] = id;
        athleteIds.push(id);
      }

      const results = mapEventResults(waResults, type, iaafIdToAthleteId);

      const waAthleteMap: Record<string, string> = {};
      for (const [iaafId, athleteId] of Object.entries(iaafIdToAthleteId)) {
        if (Number(iaafId) > 0) {
          waAthleteMap[iaafId] = athleteId;
        }
      }

      await refreshAthletes();

      onImport({
        name: selectedComp.name,
        date: selectedComp.startDate,
        location: parseVenue(selectedComp.venue),
        type,
        waCompetitionId: selectedComp.id,
        waEventId: selectedEvent.id,
        athleteIds,
        waAthleteMap,
        results,
      });
    } catch (e) {
      setError(`Import failed: ${(e as Error).message}`);
      setStep('athletes');
    }
  };

  const toggleAthlete = (index: number) => {
    setAthleteRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)),
    );
  };

  const newCount = athleteRows.filter((r) => r.selected && !r.existingId).length;
  const existingCount = athleteRows.filter((r) => r.selected && r.existingId).length;

  const showSearching = searching && !disabled;
  const showResults = !searching && competitions.length > 0 && step === 'search' && !disabled;

  return (
    <>
      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--live)' }}>{error}</div>
      )}

      {showSearching && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" style={{ width: 6, height: 6, background: 'var(--muted)', borderRadius: 99 }} />
          Searching World Athletics calendar...
        </div>
      )}

      {showResults && (
        <div style={{
          marginTop: 14,
          border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden',
          background: 'var(--bg)',
        }}>
          <div style={{
            padding: '10px 14px', background: 'var(--bg-2)',
            borderBottom: '1px solid var(--line)',
          }}>
            <span className="micro" style={{ color: 'var(--muted-2)' }}>
              WORLD ATHLETICS CALENDAR · {competitions.length} MATCHES
            </span>
          </div>
          {competitions.slice(0, 15).map((comp, i) => {
            const dateParts = comp.startDate.split('-');
            const shortDate = dateParts.length === 3
              ? `${dateParts[2]}/${dateParts[1]}`
              : comp.startDate;
            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => handleSelectCompetition(comp)}
                disabled={loading}
                style={{
                  width: '100%', display: 'grid',
                  gridTemplateColumns: '80px 1fr auto',
                  gap: 14, alignItems: 'center',
                  padding: '14px',
                  borderBottom: i < Math.min(competitions.length, 15) - 1 ? '1px solid var(--line)' : 'none',
                  background: i === 0 ? '#fff' : 'transparent',
                  border: 'none',
                  borderLeft: i === 0 ? '3px solid var(--ink)' : '3px solid transparent',
                  textAlign: 'left', cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <div className="num tnum" style={{
                  fontWeight: 800, fontSize: 16,
                  color: 'var(--ink)',
                }}>
                  {shortDate}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{comp.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                    {comp.venue}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>
                  Select &rarr;
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" style={{ width: 6, height: 6, background: 'var(--muted)', borderRadius: 99 }} />
          Loading competition data...
        </div>
      )}

      {/* Event selection (when multiple combined events) */}
      {step === 'events' && (
        <div style={{
          marginTop: 14, padding: '14px',
          border: '1px solid var(--line)', borderRadius: 10,
          background: 'var(--bg)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            {selectedComp?.name} has multiple combined events:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {combinedEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => handleSelectEvent(selectedComp!, event)}
                disabled={loading}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  background: 'var(--ink)', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {event.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Metadata-only import for future competitions */}
      {step === 'metadata-only' && selectedComp && (
        <div style={{
          marginTop: 14, padding: '14px',
          border: '1px solid var(--line)', borderRadius: 10,
          background: 'var(--bg)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {selectedComp.name} ({selectedComp.startDate})
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, marginBottom: 10 }}>
            No results data available yet. Import metadata and select the event type.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => handleMetadataImport('decathlon')}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                background: 'var(--ink)', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer',
              }}
            >
              Import as Decathlon
            </button>
            <button
              type="button"
              onClick={() => handleMetadataImport('heptathlon')}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                background: 'var(--ink)', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer',
              }}
            >
              Import as Heptathlon
            </button>
          </div>
        </div>
      )}

      {/* Athlete preview */}
      {step === 'athletes' && (
        <div style={{ marginTop: 14 }}>
          <div style={{
            border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden',
            background: 'var(--bg)',
          }}>
            <div style={{
              padding: '10px 14px', background: 'var(--bg-2)',
              borderBottom: '1px solid var(--line)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span className="micro" style={{ color: 'var(--muted-2)' }}>
                {selectedComp?.name} · {selectedEvent?.name}
              </span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  <span className="tnum" style={{ fontWeight: 700, color: 'var(--ink)' }}>{existingCount}</span> existing ·{' '}
                  <span className="tnum" style={{ fontWeight: 700, color: 'var(--brand)' }}>{newCount}</span> new
                </span>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={athleteRows.every((r) => !r.selected)}
                  style={{
                    padding: '6px 12px', fontSize: 12, fontWeight: 600,
                    background: 'var(--ink)', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                    opacity: athleteRows.every((r) => !r.selected) ? 0.5 : 1,
                  }}
                >
                  Import
                </button>
              </div>
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {athleteRows.map((row, i) => (
                <label
                  key={row.iaafId}
                  style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 60px auto',
                    padding: '10px 14px', alignItems: 'center', gap: 10,
                    borderBottom: i < athleteRows.length - 1 ? '1px solid var(--line)' : 'none',
                    cursor: 'pointer',
                    background: row.selected ? '#fff' : 'transparent',
                    opacity: row.selected ? 1 : 0.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => toggleAthlete(i)}
                    style={{ accentColor: 'var(--ink)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</div>
                    {row.existingId && (
                      <div style={{ fontSize: 10, color: 'var(--pb)' }}>Already in roster</div>
                    )}
                  </div>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                    {row.nationality}
                  </span>
                  {!row.existingId && (
                    <span className="micro" style={{
                      padding: '2px 6px', borderRadius: 4,
                      background: 'var(--brand-soft)', color: 'var(--brand)', fontWeight: 700,
                    }}>NEW</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Importing progress */}
      {step === 'importing' && (
        <div style={{
          marginTop: 14, padding: '12px 14px',
          border: '1px solid var(--line)', borderRadius: 10,
          background: 'var(--bg)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="live-dot" style={{ width: 6, height: 6, background: 'var(--muted)', borderRadius: 99 }} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{importProgress || 'Importing...'}</span>
        </div>
      )}
    </>
  );
}

/** Convert "Damian WARNER" -> "Damian Warner" */
function formatWAName(name: string): string {
  return name
    .split(' ')
    .map((part) => {
      if (part === part.toUpperCase() && part.length > 1) {
        return part.charAt(0) + part.slice(1).toLowerCase();
      }
      return part;
    })
    .join(' ');
}
