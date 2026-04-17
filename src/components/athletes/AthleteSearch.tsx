import { useState, useRef } from 'react';
import type { Gender } from '../../types';
import {
  searchAthletes,
  fetchAthleteProfile,
  mapPersonalBests,
  extractCombinedPB,
  type WASearchResult,
} from '../../lib/worldathletics';

interface Props {
  gender: Gender;
  onImport: (data: {
    name: string;
    nationality: string;
    personalBests: Record<string, number>;
    combinedPB?: number;
    waAthleteId: string;
  }) => void;
}

export function AthleteSearch({ gender, onImport }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WASearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setSearching(true);
    setError('');
    setResults([]);
    try {
      const data = await searchAthletes(query.trim());
      setResults(data);
      if (data.length === 0) setError('No athletes found.');
    } catch {
      setError('Search failed. The World Athletics API may be unavailable.');
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (athlete: WASearchResult) => {
    setImporting(athlete.aaAthleteId);
    setError('');
    try {
      const profile = await fetchAthleteProfile(athlete.aaAthleteId);
      const pbs = mapPersonalBests(profile.personalBests, gender);
      const combinedPB = extractCombinedPB(profile.personalBests, gender);
      onImport({
        name: profile.name,
        nationality: profile.country,
        personalBests: pbs,
        combinedPB,
        waAthleteId: athlete.aaAthleteId,
      });
      setResults([]);
      setQuery('');
    } catch {
      setError('Failed to load athlete profile.');
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
          placeholder="Search World Athletics (e.g. Kevin Mayer)"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {results.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Country</th>
                <th className="px-3 py-2 font-medium">Born</th>
                <th className="px-3 py-2 font-medium">Disciplines</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.aaAthleteId} className="border-t border-gray-100 dark:border-gray-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
                  <td className="px-3 py-2 font-medium">{r.givenName} {r.familyName}</td>
                  <td className="px-3 py-2">{r.country}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.birthDate ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs max-w-[200px] truncate">{r.disciplines}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleImport(r)}
                      disabled={importing !== null}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {importing === r.aaAthleteId ? 'Loading...' : 'Import PBs'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
