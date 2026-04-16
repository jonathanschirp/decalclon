import { useState } from 'react';
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

export function CompetitionSearch({ onImport }: Props) {
  const { athletes: dbAthletes, create: createAthlete, fetch: refreshAthletes } = useAthletes();

  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
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

  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setError('');
    setCompetitions([]);
    setStep('search');
    try {
      const results = await searchCompetitions(query.trim());
      setCompetitions(results);
      if (results.length === 0) setError('No competitions found.');
    } catch {
      setError('Search failed. The World Athletics API may be unavailable.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCompetition = async (comp: WACompetition) => {
    setSelectedComp(comp);
    setLoading(true);
    setError('');
    try {
      const events = await fetchCombinedEvents(comp.id);
      if (events.length === 0) {
        // No results data yet (future competition) — import metadata only
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
      // API error (typical for future competitions) — fall back to metadata-only import
      setStep('metadata-only');
      setLoading(false);
    }
  };

  const handleSelectEvent = async (comp: WACompetition, event: WACombinedEvent) => {
    setSelectedEvent(event);
    setLoading(true);
    setError('');
    try {
      // Try results first (completed or in-progress competitions)
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
        // No results yet — try start list (upcoming competitions)
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
              iaafId: -(i + 1), // negative placeholder since start list has no iaafId
              existingId,
              selected: true,
            };
          });
        } else {
          // Neither results nor start list — metadata-only
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

        // Create new athlete: search WA to get aaAthleteId, then fetch PBs
        setImportProgress(`Creating athlete ${i + 1}/${selected.length}: ${row.name}`);

        let waAthleteId: string | undefined;
        let combinedPB: number | undefined;
        let pbs: Record<string, number> = {};

        try {
          const searchResults = await searchAthletes(row.name);
          // Match by country + closest name
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
          combinedPB,
          waAthleteId,
        });

        iaafIdToAthleteId[String(row.iaafId)] = id;
        athleteIds.push(id);
      }

      const results = mapEventResults(waResults, type, iaafIdToAthleteId);

      // Build the waAthleteMap for future syncing (only real iaafIds, not placeholders)
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

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
          placeholder="Search World Athletics competitions (e.g. Gotzis, Ratingen)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || query.trim().length < 2}
          className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Competition results */}
      {step === 'search' && competitions.length > 0 && (
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 font-medium">Competition</th>
                <th className="px-3 py-2 font-medium">Venue</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {competitions.slice(0, 15).map((comp) => (
                <tr key={comp.id} className="border-t border-gray-100 hover:bg-blue-50/50">
                  <td className="px-3 py-2 font-medium">{comp.name}</td>
                  <td className="px-3 py-2 text-gray-500">{comp.venue}</td>
                  <td className="px-3 py-2 text-gray-500">{comp.startDate}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleSelectCompetition(comp)}
                      disabled={loading}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Event selection (when multiple combined events) */}
      {step === 'events' && (
        <div className="border border-gray-200 rounded-md p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {selectedComp?.name} has multiple combined events. Select one:
          </p>
          <div className="flex gap-2">
            {combinedEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => handleSelectEvent(selectedComp!, event)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {event.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Metadata-only import for future competitions */}
      {step === 'metadata-only' && selectedComp && (
        <div className="border border-gray-200 rounded-md p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {selectedComp.name} ({selectedComp.startDate}) — no results data available yet.
          </p>
          <p className="text-xs text-gray-500">
            Import competition metadata and select the event type. You can add athletes manually and sync results once the competition starts.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleMetadataImport('decathlon')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Import as Decathlon
            </button>
            <button
              type="button"
              onClick={() => handleMetadataImport('heptathlon')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Import as Heptathlon
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <p className="text-sm text-gray-500">Loading competition data...</p>
      )}

      {/* Athlete preview */}
      {step === 'athletes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                {selectedComp?.name} — {selectedEvent?.name}
              </p>
              <p className="text-xs text-gray-500">
                {existingCount} existing, {newCount} new athletes to create
              </p>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={athleteRows.every((r) => !r.selected)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Import Competition
            </button>
          </div>

          <div className="border border-gray-200 rounded-md overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-left">
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2 font-medium">Athlete</th>
                  <th className="px-3 py-2 font-medium">Country</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {athleteRows.map((row, i) => (
                  <tr key={row.iaafId} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleAthlete(i)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2">{row.nationality}</td>
                    <td className="px-3 py-2">
                      {row.existingId ? (
                        <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">Exists</span>
                      ) : (
                        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">New</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Importing progress */}
      {step === 'importing' && (
        <div className="border border-gray-200 rounded-md p-4">
          <p className="text-sm text-gray-700">{importProgress || 'Importing...'}</p>
        </div>
      )}
    </div>
  );
}

/** Convert "Damian WARNER" → "Damian Warner" */
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
