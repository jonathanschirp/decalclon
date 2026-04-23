import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAthletes } from '../hooks/useAthletes';
import { AthleteList } from '../components/athletes/AthleteList';
import type { Gender } from '../types';
import { getContinent, resolveCountryName } from '../lib/countries';

type DisciplineFilter = 'all' | Gender;
type SortField = 'name' | 'pb';
type SortDir = 'asc' | 'desc';

export function AthletesPage() {
  const { athletes, loading, fetch } = useAthletes();
  const [search, setSearch] = useState('');
  const [discipline, setDiscipline] = useState<DisciplineFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    fetch();
  }, [fetch]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'pb' ? 'desc' : 'asc');
    }
  };

  const filtered = useMemo(() => {
    let list = athletes;

    if (discipline !== 'all') {
      list = list.filter((a) => a.gender === discipline);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => {
        const nameMatch = a.name.toLowerCase().includes(q);
        const natMatch = a.nationality?.toLowerCase().includes(q);
        const fullCountry = a.nationality ? resolveCountryName(a.nationality).toLowerCase() : undefined;
        const countryMatch = fullCountry?.includes(q);
        const continent = a.nationality ? getContinent(a.nationality) : undefined;
        const continentMatch = continent?.toLowerCase().includes(q);
        return nameMatch || natMatch || countryMatch || continentMatch;
      });
    }

    const sorted = [...list].sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.name.localeCompare(b.name);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const aPB = a.combinedPB ?? -1;
      const bPB = b.combinedPB ?? -1;
      const cmp = aPB - bPB;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [athletes, discipline, search, sortField, sortDir]);

  const decCount = athletes.filter((a) => a.gender === 'male').length;
  const hepCount = athletes.filter((a) => a.gender === 'female').length;

  const arrow = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="micro" style={{ color: 'var(--muted-2)', marginBottom: 6 }}>02 · ATHLETES</div>
          <h1 className="display" style={{ fontSize: 36, fontWeight: 700, margin: 0, letterSpacing: '-.025em' }}>
            Roster
          </h1>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>
            <span className="tnum" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{athletes.length}</span> athletes ·{' '}
            {decCount} decathletes · {hepCount} heptathletes
          </div>
        </div>
        <Link
          to="/athletes/new"
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ background: 'var(--ink)', color: '#fff' }}
        >
          + Add Athlete
        </Link>
      </div>

      {/* Filter bar */}
      <div
        style={{
          padding: 10, border: '1px solid var(--line)',
          borderRadius: 10, background: 'var(--surface)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        {/* Search row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--muted-2)', marginLeft: 4, flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, country or continent..."
            className="text-sm"
            style={{
              flex: 1, minWidth: 0,
              border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'inherit', color: 'var(--ink)',
            }}
          />
        </div>
        {/* Discipline filter */}
        <div className="flex gap-1" style={{ background: 'var(--bg)', padding: 3, borderRadius: 8, maxWidth: 360 }}>
          {([['all', 'All'], ['male', 'Decathlon'], ['female', 'Heptathlon']] as const).map(
            ([value, label]) => (
              <button
                key={value}
                onClick={() => setDiscipline(value)}
                style={{
                  flex: 1,
                  padding: '4px 10px', fontSize: 12, fontWeight: 600,
                  background: discipline === value ? 'var(--ink)' : 'transparent',
                  color: discipline === value ? '#fff' : 'var(--muted)',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Sort controls — right-aligned above the table */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div className="flex gap-1" style={{ background: 'var(--surface)', padding: 3, borderRadius: 8, border: '1px solid var(--line)' }}>
          {([['name', 'Name'], ['pb', 'PB']] as const).map(([field, label]) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              style={{
                padding: '4px 10px', fontSize: 12, fontWeight: 600,
                background: sortField === field ? 'var(--ink)' : 'transparent',
                color: sortField === field ? '#fff' : 'var(--muted)',
                border: 'none', borderRadius: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {label}
              <span style={{ fontSize: 10, opacity: sortField === field ? 1 : 0.5 }}>{arrow(field)}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading...</div>
      ) : (
        <>
          {athletes.length > 0 && filtered.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
              No athletes match your search.
            </div>
          ) : (
            <AthleteList athletes={filtered} />
          )}
        </>
      )}
    </div>
  );
}
