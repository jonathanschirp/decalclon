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

    setSearching(true);

    debounceRef.current = setTimeout(async () => {
      lastSearchRef.current = trimmed;
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

  // Expose searching state for parent
  const showSearching = searching && !disabled;
  const showResults = !searching && results.length > 0 && !disabled;
  const matchCount = results.length;

  return (
    <>
      {/* Status chip — rendered by parent via getStatus() */}
      {/* Progress + results dropdown */}
      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--live)' }}>{error}</div>
      )}

      {showSearching && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" style={{ width: 6, height: 6, background: 'var(--muted)', borderRadius: 99 }} />
          Searching World Athletics...
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
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid var(--line)',
          }}>
            <span className="micro" style={{ color: 'var(--muted-2)' }}>RESULTS FROM WORLD ATHLETICS · {matchCount}</span>
          </div>
          {results.map((r, i) => (
            <button
              key={r.aaAthleteId}
              type="button"
              onClick={() => handleImport(r)}
              disabled={importing !== null}
              style={{
                width: '100%', display: 'grid',
                gridTemplateColumns: 'auto 1fr auto auto', gap: 14,
                alignItems: 'center',
                padding: '12px 14px',
                borderBottom: i < results.length - 1 ? '1px solid var(--line)' : 'none',
                background: i === 0 ? '#fff' : 'transparent',
                border: 'none',
                borderLeft: i === 0 ? '3px solid var(--ink)' : '3px solid transparent',
                textAlign: 'left', cursor: importing ? 'wait' : 'pointer',
                opacity: importing !== null ? 0.5 : 1,
              }}
            >
              <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                {r.country}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.givenName} {r.familyName}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                  {r.birthDate && <span>Born {r.birthDate} · </span>}
                  {r.disciplines && <span>{r.disciplines} · </span>}
                  WA {r.aaAthleteId}
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>
                {importing === r.aaAthleteId ? 'Loading...' : 'Select →'}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
