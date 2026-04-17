import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import type { Athlete, Gender } from '../../types';
import { getEventsForType } from '../../lib/events';
import { calculatePoints, parseTimeInput, formatTime } from '../../lib/scoring';
import { useAthletes } from '../../hooks/useAthletes';
import { AthleteSearch } from './AthleteSearch';
import { COUNTRIES } from '../../lib/countries';
import type { EventDefinition } from '../../types';

interface Props {
  athlete?: Athlete;
}

const countryOptions = COUNTRIES.map((c) => ({ value: c, label: c }));

/** Events where performances typically exceed 60s and use m:ss.xx format */
const LONG_TRACK_IDS = new Set([
  'dec_400m', 'dec_1500m', 'hep_800m',
]);

/**
 * Filter input characters for performance fields.
 * - Field events: digits and one decimal point
 * - Sprint track events: digits and one decimal point
 * - Long track events: digits, one colon, and one decimal point
 */
function filterPerformanceInput(
  value: string,
  event: EventDefinition,
): string {
  if (event.type === 'field') {
    // Only allow digits and a single dot, max 2 decimal places
    let filtered = '';
    let hasDot = false;
    let decimals = 0;
    for (const ch of value) {
      if (ch >= '0' && ch <= '9') {
        if (hasDot) {
          if (decimals < 2) { filtered += ch; decimals++; }
        } else {
          filtered += ch;
        }
      } else if (ch === '.' && !hasDot) {
        filtered += ch;
        hasDot = true;
      }
    }
    return filtered;
  }

  // Track events
  const isLong = LONG_TRACK_IDS.has(event.id);

  let filtered = '';
  let hasDot = false;
  let hasColon = false;
  let decimals = 0;

  for (const ch of value) {
    if (ch >= '0' && ch <= '9') {
      if (hasDot) {
        if (decimals < 2) { filtered += ch; decimals++; }
      } else {
        filtered += ch;
      }
    } else if (ch === '.' && !hasDot) {
      filtered += ch;
      hasDot = true;
    } else if (ch === ':' && isLong && !hasColon && !hasDot) {
      filtered += ch;
      hasColon = true;
    }
  }
  return filtered;
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
          Object.entries(athlete.personalBests).map(([k, v]) => {
            const events = getEventsForType(athlete.gender === 'male' ? 'decathlon' : 'heptathlon');
            const ev = events.find((e) => e.id === k);
            return [k, ev?.type === 'track' ? formatTime(v) : String(v)];
          }),
        )
      : {},
  );
  const [combinedPB, setCombinedPB] = useState(athlete?.combinedPB != null ? String(athlete.combinedPB) : '');
  const [waAthleteId, setWaAthleteId] = useState<string | undefined>(athlete?.waAthleteId);
  const [imported, setImported] = useState(false);
  const [saving, setSaving] = useState(false);

  const events = getEventsForType(gender === 'male' ? 'decathlon' : 'heptathlon');

  const selectedCountry = useMemo(
    () => countryOptions.find((o) => o.value === nationality) ?? (nationality ? { value: nationality, label: nationality } : null),
    [nationality],
  );

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

  const placeholder = (event: EventDefinition) => {
    if (event.type === 'field') return 'e.g. 7.65';
    if (LONG_TRACK_IDS.has(event.id)) return 'e.g. 4:11.30';
    return 'e.g. 10.85';
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => { setName(e.target.value); setImported(false); }}
            placeholder={!athlete ? 'Start typing to search World Athletics...' : ''}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {!athlete && (
            <AthleteSearch
              query={name}
              disabled={imported}
              onImport={(data) => {
                setName(data.name);
                setNationality(data.nationality);
                setGender(data.gender);
                setWaAthleteId(data.waAthleteId);
                setImported(true);
                if (data.combinedPB != null) setCombinedPB(String(data.combinedPB));
                const events = getEventsForType(data.gender === 'male' ? 'decathlon' : 'heptathlon');
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
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender *</label>
          <select
            value={gender}
            onChange={(e) => {
              setGender(e.target.value as Gender);
              setPersonalBests({});
            }}
            disabled={!!athlete}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="male">Male (Decathlon)</option>
            <option value="female">Female (Heptathlon)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nationality</label>
          <Select
            options={countryOptions}
            value={selectedCountry}
            onChange={(opt) => setNationality(opt?.value ?? '')}
            isClearable
            placeholder="Search country..."
            classNames={{
              control: () => '!min-h-[42px] !border-gray-300 dark:!border-gray-600 !bg-white dark:!bg-gray-800 !rounded-md !shadow-none focus-within:!ring-2 focus-within:!ring-blue-500 focus-within:!border-blue-500',
              menu: () => '!z-20 !bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700',
              option: ({ isFocused, isSelected }) =>
                isSelected
                  ? '!bg-blue-600 !text-white'
                  : isFocused
                    ? '!bg-blue-50 dark:!bg-gray-700 !text-gray-900 dark:!text-gray-100'
                    : '!text-gray-900 dark:!text-gray-100',
              singleValue: () => '!text-gray-900 dark:!text-gray-100',
              input: () => '!text-gray-900 dark:!text-gray-100',
              placeholder: () => '!text-gray-400 dark:!text-gray-500',
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {gender === 'male' ? 'Decathlon' : 'Heptathlon'} PB
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={combinedPB}
            onChange={(e) => {
              const filtered = e.target.value.replace(/\D/g, '');
              setCombinedPB(filtered);
            }}
            placeholder="e.g. 9126"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3 dark:text-gray-100">
          Personal Bests — {gender === 'male' ? 'Decathlon' : 'Heptathlon'}
        </h3>
        <div className="space-y-2">
          {events.map((event) => {
            const pts = getPoints(event.id);
            return (
              <div key={event.id} className="flex items-center gap-3">
                <label className="w-36 text-sm font-medium text-gray-700 dark:text-gray-300">{event.name}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={personalBests[event.id] ?? ''}
                  onChange={(e) => {
                    const filtered = filterPerformanceInput(
                      e.target.value,
                      event,
                    );
                    setPersonalBests((prev) => ({ ...prev, [event.id]: filtered }));
                  }}
                  placeholder={placeholder(event)}
                  className="w-40 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 w-16">
                  {event.type === 'track' ? (LONG_TRACK_IDS.has(event.id) ? 'm:ss' : 'sec') : 'm'}
                </span>
                {pts !== null && (
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">{pts} pts</span>
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
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
