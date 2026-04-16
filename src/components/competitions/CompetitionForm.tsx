import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Competition, CompetitionType, CompetitionStatus, CompetitionResults } from '../../types';
import { useCompetitions } from '../../hooks/useCompetition';
import { useAthletes } from '../../hooks/useAthletes';
import { CompetitionSearch, type CompetitionImportData } from './CompetitionSearch';
import { fetchAthleteProfile, mapPersonalBests, extractCombinedPB } from '../../lib/worldathletics';
import { updateAthlete } from '../../lib/firebase';

interface Props {
  competition?: Competition;
}

export function CompetitionForm({ competition }: Props) {
  const navigate = useNavigate();
  const { create, update } = useCompetitions();
  const { athletes, fetch: fetchAthletes } = useAthletes();
  const [name, setName] = useState(competition?.name ?? '');
  const [date, setDate] = useState(competition?.date ?? '');
  const [location, setLocation] = useState(competition?.location ?? '');
  const [type, setType] = useState<CompetitionType>(competition?.type ?? 'decathlon');
  const [status, setStatus] = useState<CompetitionStatus>(competition?.status ?? 'upcoming');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>(competition?.athleteIds ?? []);
  const [waCompetitionId, setWaCompetitionId] = useState<number | undefined>(competition?.waCompetitionId);
  const [waEventId, setWaEventId] = useState<number | undefined>(competition?.waEventId);
  const [waAthleteMap, setWaAthleteMap] = useState<Record<string, string>>(competition?.waAthleteMap ?? {});
  const [importedResults, setImportedResults] = useState<CompetitionResults | null>(null);
  const [saving, setSaving] = useState(false);

  // Athlete search / filter
  const [athleteSearch, setAthleteSearch] = useState('');

  // PB reload state
  const [reloading, setReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState('');

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  const gender = type === 'decathlon' ? 'male' : 'female';

  const eligibleAthletes = useMemo(
    () => athletes.filter((a) => a.gender === gender),
    [athletes, gender],
  );

  // Split into selected and unselected, each filtered by search
  const filterBySearch = useMemo(() => {
    const q = athleteSearch.toLowerCase().trim();
    if (!q) return eligibleAthletes;
    return eligibleAthletes.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.nationality?.toLowerCase().includes(q),
    );
  }, [eligibleAthletes, athleteSearch]);

  const selectedSet = useMemo(() => new Set(selectedAthletes), [selectedAthletes]);

  const selectedList = useMemo(
    () => filterBySearch.filter((a) => selectedSet.has(a.id)),
    [filterBySearch, selectedSet],
  );
  const unselectedList = useMemo(
    () => filterBySearch.filter((a) => !selectedSet.has(a.id)),
    [filterBySearch, selectedSet],
  );

  // Count of selected athletes with WA profile
  const waLinkedCount = useMemo(
    () => eligibleAthletes.filter((a) => selectedSet.has(a.id) && a.waAthleteId).length,
    [eligibleAthletes, selectedSet],
  );

  // Remove stale IDs of deleted athletes once the athlete list has loaded
  useEffect(() => {
    if (athletes.length === 0) return;
    const validIds = new Set(athletes.map((a) => a.id));
    setSelectedAthletes((prev) => {
      const filtered = prev.filter((id) => validIds.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [athletes]);

  const toggleAthlete = (id: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleReloadPBs = async () => {
    const toReload = eligibleAthletes.filter(
      (a) => selectedSet.has(a.id) && a.waAthleteId,
    );
    if (toReload.length === 0) return;

    setReloading(true);
    try {
      for (let i = 0; i < toReload.length; i++) {
        const athlete = toReload[i];
        setReloadProgress(`${i + 1}/${toReload.length}: ${athlete.name}`);
        try {
          const profile = await fetchAthleteProfile(athlete.waAthleteId!);
          const pbs = mapPersonalBests(profile.personalBests, gender as 'male' | 'female');
          const combinedPB = extractCombinedPB(profile.personalBests, gender as 'male' | 'female');
          await updateAthlete(athlete.id, { personalBests: pbs, combinedPB });
        } catch {
          // Skip individual failures silently
        }
      }
      // Refresh athlete list to pick up new PBs
      await fetchAthletes();
    } finally {
      setReloading(false);
      setReloadProgress('');
    }
  };

  const handleImport = (data: CompetitionImportData) => {
    setName(data.name);
    setDate(data.date);
    setLocation(data.location);
    setType(data.type);
    setStatus(Object.keys(data.results).length > 0 ? 'in_progress' : 'upcoming');
    setSelectedAthletes(data.athleteIds);
    setWaCompetitionId(data.waCompetitionId);
    setWaEventId(data.waEventId);
    setWaAthleteMap(data.waAthleteMap);
    setImportedResults(data.results);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (competition) {
        await update(competition.id, {
          name, date, location, type, status,
          athleteIds: selectedAthletes,
          waCompetitionId,
          waEventId,
          waAthleteMap,
        });
        navigate(`/competitions/${competition.id}`);
      } else {
        const id = await create({
          name, date, location, type, status,
          athleteIds: selectedAthletes,
          results: importedResults ?? {},
          waCompetitionId,
          waEventId,
          waAthleteMap,
        });
        navigate(`/competitions/${id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {!competition && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Import from World Athletics</h3>
          <CompetitionSearch onImport={handleImport} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as CompetitionType);
              setSelectedAthletes([]);
            }}
            disabled={!!competition}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="decathlon">Decathlon (Men)</option>
            <option value="heptathlon">Heptathlon (Women)</option>
          </select>
        </div>
        {competition && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CompetitionStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="upcoming">Upcoming</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* Athlete enrollment section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">
            Athletes
            <span className="text-sm font-normal text-gray-500 ml-2">
              {selectedAthletes.length} selected
            </span>
          </h3>
          {waLinkedCount > 0 && (
            <button
              type="button"
              onClick={handleReloadPBs}
              disabled={reloading}
              className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-50"
            >
              {reloading ? 'Reloading...' : `Reload PBs (${waLinkedCount})`}
            </button>
          )}
        </div>

        {reloading && reloadProgress && (
          <div className="mb-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-3 py-2">
            {reloadProgress}
          </div>
        )}

        {/* Search input */}
        <input
          type="text"
          value={athleteSearch}
          onChange={(e) => setAthleteSearch(e.target.value)}
          placeholder="Search athletes by name or nationality..."
          className="w-full px-3 py-2 mb-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {eligibleAthletes.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No {type === 'decathlon' ? 'male' : 'female'} athletes available.
          </p>
        ) : (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            {/* Selected athletes */}
            {selectedList.length > 0 && (
              <div className="bg-blue-50/50">
                {selectedList.map((athlete) => (
                  <label
                    key={athlete.id}
                    className="flex items-center gap-3 px-3 py-2.5 border-b border-blue-100 last:border-b-0 hover:bg-blue-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleAthlete(athlete.id)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">{athlete.name}</span>
                    {athlete.nationality && (
                      <span className="text-xs text-gray-500 shrink-0">{athlete.nationality}</span>
                    )}
                    {athlete.combinedPB != null && (
                      <span className="text-xs font-mono font-semibold text-blue-700 shrink-0">{athlete.combinedPB}</span>
                    )}
                    {athlete.waAthleteId && (
                      <span className="text-[10px] text-slate-400 shrink-0" title="Linked to World Athletics">WA</span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {/* Divider between selected and unselected */}
            {selectedList.length > 0 && unselectedList.length > 0 && (
              <div className="border-t-2 border-gray-300" />
            )}

            {/* Unselected athletes */}
            {unselectedList.length > 0 && (
              <div className="max-h-52 overflow-y-auto">
                {unselectedList.map((athlete) => (
                  <label
                    key={athlete.id}
                    className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggleAthlete(athlete.id)}
                      className="rounded"
                    />
                    <span className="text-sm flex-1 min-w-0 truncate">{athlete.name}</span>
                    {athlete.nationality && (
                      <span className="text-xs text-gray-400 shrink-0">{athlete.nationality}</span>
                    )}
                    {athlete.combinedPB != null && (
                      <span className="text-xs font-mono text-gray-400 shrink-0">{athlete.combinedPB}</span>
                    )}
                    {athlete.waAthleteId && (
                      <span className="text-[10px] text-slate-300 shrink-0" title="Linked to World Athletics">WA</span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {filterBySearch.length === 0 && athleteSearch.trim() && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No athletes match "{athleteSearch}"
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || !name.trim() || !date}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : competition ? 'Update Competition' : 'Create Competition'}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
