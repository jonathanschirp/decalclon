import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Athlete, Gender } from '../../types';
import { getEventsForType } from '../../lib/events';
import { calculatePoints, parseTimeInput, formatTime } from '../../lib/scoring';
import { useAthletes } from '../../hooks/useAthletes';
import { AthleteSearch } from './AthleteSearch';

interface Props {
  athlete?: Athlete;
}

export function AthleteForm({ athlete }: Props) {
  const navigate = useNavigate();
  const { create, update } = useAthletes();
  const [name, setName] = useState(athlete?.name ?? '');
  const [gender, setGender] = useState<Gender>(athlete?.gender ?? 'male');
  const [nationality, setNationality] = useState(athlete?.nationality ?? '');
  const [personalBests, setPersonalBests] = useState<Record<string, string>>(
    athlete
      ? Object.fromEntries(
          Object.entries(athlete.personalBests).map(([k, v]) => [k, String(v)]),
        )
      : {},
  );
  const [combinedPB, setCombinedPB] = useState(athlete?.combinedPB != null ? String(athlete.combinedPB) : '');
  const [waAthleteId, setWaAthleteId] = useState<string | undefined>(athlete?.waAthleteId);
  const [saving, setSaving] = useState(false);

  const events = getEventsForType(gender === 'male' ? 'decathlon' : 'heptathlon');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const pbs: Record<string, number> = {};
    for (const [eventId, val] of Object.entries(personalBests)) {
      if (!val.trim()) continue;
      const event = events.find((ev) => ev.id === eventId);
      if (!event) continue;
      const parsed = event.type === 'track' ? parseTimeInput(val) : parseFloat(val);
      if (parsed != null && parsed > 0) {
        pbs[eventId] = parsed;
      }
    }

    const parsedCombinedPB = combinedPB.trim() ? parseInt(combinedPB, 10) : undefined;

    try {
      if (athlete) {
        await update(athlete.id, { name, gender, nationality, personalBests: pbs, combinedPB: parsedCombinedPB, waAthleteId });
        navigate(`/athletes/${athlete.id}`);
      } else {
        const id = await create({ name, gender, nationality, personalBests: pbs, combinedPB: parsedCombinedPB, waAthleteId });
        navigate(`/athletes/${id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const getPoints = (eventId: string): number | null => {
    const val = personalBests[eventId];
    if (!val?.trim()) return null;
    const event = events.find((ev) => ev.id === eventId);
    if (!event) return null;
    const parsed = event.type === 'track' ? parseTimeInput(val) : parseFloat(val);
    if (parsed == null || parsed <= 0) return null;
    return calculatePoints(event, parsed);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
          <select
            value={gender}
            onChange={(e) => {
              setGender(e.target.value as Gender);
              setPersonalBests({});
            }}
            disabled={!!athlete}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="male">Male (Decathlon)</option>
            <option value="female">Female (Heptathlon)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
          <input
            type="text"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {gender === 'male' ? 'Decathlon' : 'Heptathlon'} PB
          </label>
          <input
            type="text"
            value={combinedPB}
            onChange={(e) => setCombinedPB(e.target.value)}
            placeholder="e.g. 9126"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {!athlete && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Import from World Athletics</h3>
          <AthleteSearch
            gender={gender}
            onImport={(data) => {
              setName(data.name);
              setNationality(data.nationality);
              setWaAthleteId(data.waAthleteId);
              if (data.combinedPB != null) setCombinedPB(String(data.combinedPB));
              const events = getEventsForType(gender === 'male' ? 'decathlon' : 'heptathlon');
              const pbStrings: Record<string, string> = {};
              for (const event of events) {
                const val = data.personalBests[event.id];
                if (val != null) {
                  pbStrings[event.id] = event.type === 'track' ? formatTime(val) : String(val);
                }
              }
              setPersonalBests(pbStrings);
            }}
          />
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-3">
          Personal Bests — {gender === 'male' ? 'Decathlon' : 'Heptathlon'}
        </h3>
        <div className="space-y-2">
          {events.map((event) => {
            const pts = getPoints(event.id);
            return (
              <div key={event.id} className="flex items-center gap-3">
                <label className="w-36 text-sm font-medium text-gray-700">{event.name}</label>
                <input
                  type="text"
                  value={personalBests[event.id] ?? ''}
                  onChange={(e) =>
                    setPersonalBests((prev) => ({ ...prev, [event.id]: e.target.value }))
                  }
                  placeholder={event.type === 'track' ? 'seconds or m:ss.xx' : 'meters'}
                  className="w-40 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500 w-16">
                  {event.type === 'track' ? 'sec' : 'm'}
                </span>
                {pts !== null && (
                  <span className="text-sm font-semibold text-blue-700">{pts} pts</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : athlete ? 'Update Athlete' : 'Create Athlete'}
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
