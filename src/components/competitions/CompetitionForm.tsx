import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Competition, CompetitionType, CompetitionStatus, CompetitionResults } from '../../types';
import { useCompetitions } from '../../hooks/useCompetition';
import { useAthletes } from '../../hooks/useAthletes';
import { CompetitionSearch, type CompetitionImportData } from './CompetitionSearch';

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

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  const eligibleAthletes = athletes.filter(
    (a) => a.gender === (type === 'decathlon' ? 'male' : 'female'),
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

      <div>
        <h3 className="text-lg font-semibold mb-3">
          Enroll Athletes ({selectedAthletes.length} selected)
        </h3>
        {eligibleAthletes.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No {type === 'decathlon' ? 'male' : 'female'} athletes available.
          </p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
            {eligibleAthletes.map((athlete) => (
              <label
                key={athlete.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedAthletes.includes(athlete.id)}
                  onChange={() => toggleAthlete(athlete.id)}
                  className="rounded"
                />
                <span className="text-sm">{athlete.name}</span>
                {athlete.nationality && (
                  <span className="text-xs text-gray-400">{athlete.nationality}</span>
                )}
              </label>
            ))}
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
