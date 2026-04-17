import { useState, useRef, useEffect } from 'react';
import type { Gender } from '../../types';
import {
  searchAthletes,
  fetchAthleteProfile,
  mapPersonalBests,
  extractCombinedPB,
  type WASearchResult,
} from '../../lib/worldathletics';

interface Props {
  query: string;
  disabled?: boolean;
  onImport: (data: {
    name: string;
    nationality: string;
    gender: Gender;
    personalBests: Record<string, number>;
    combinedPB?: number;
    waAthleteId: string;
  }) => void;
}

const DEBOUNCE_MS = 600;

export function AthleteSearch({ query, disabled, onImport }: Props) {
  const [results, setResults] = useState<WASearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchRef = useRef('');

  // Clear results when disabled
  useEffect(() => {
    if (disabled) {
      setResults([]);
      setError('');
      setSearching(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, [disabled]);

  // Auto-search with debounce when query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (disabled) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError('');
      lastSearchRef.current = '';
      return;
    }

    // Don't re-search the same query
    if (trimmed === lastSearchRef.current) return;

    debounceRef.current = setTimeout(async () => {
      lastSearchRef.current = trimmed;
      setSearching(true);
      setError('');
      setResults([]);
      try {
        const data = await searchAthletes(trimmed);
        setResults(data);
        if (data.length === 0) setError('No athletes found on World Athletics.');
      } catch {
        setError('Search failed. The World Athletics API may be unavailable.');
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleImport = async (athlete: WASearchResult) => {
    setImporting(athlete.aaAthleteId);
    setError('');
    try {
      const profile = await fetchAthleteProfile(athlete.aaAthleteId);
      const hasHeptathlon = profile.personalBests.some((pb) => pb.discipline === 'Heptathlon');
      const importGender: Gender = hasHeptathlon ? 'female' : 'male';
      const pbs = mapPersonalBests(profile.personalBests, importGender);
      const combinedPB = extractCombinedPB(profile.personalBests, importGender);
      onImport({
        name: profile.name,
        nationality: profile.country,
        gender: importGender,
        personalBests: pbs,
        combinedPB,
        waAthleteId: athlete.aaAthleteId,
      });
      setResults([]);
    } catch {
      setError('Failed to load athlete profile.');
    } finally {
      setImporting(null);
    }
  };

  if (!searching && results.length === 0 && !error) return null;

  return (
    <div className="space-y-2">
      {searching && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Searching World Athletics...</p>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {results.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            World Athletics results — select to import PBs
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.aaAthleteId}
                type="button"
                onClick={() => handleImport(r)}
                disabled={importing !== null}
                className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {r.givenName} {r.familyName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-2">
                    <span>{r.country}</span>
                    {r.birthDate && <span>{r.birthDate}</span>}
                    {r.disciplines && (
                      <span className="truncate max-w-[180px]">{r.disciplines}</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700">
                  {importing === r.aaAthleteId ? 'Loading...' : 'Import'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
