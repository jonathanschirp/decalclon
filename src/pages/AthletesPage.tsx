import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAthletes } from '../hooks/useAthletes';
import { AthleteList } from '../components/athletes/AthleteList';
import type { Gender } from '../types';

type DisciplineFilter = 'all' | Gender;

export function AthletesPage() {
  const { athletes, loading, fetch } = useAthletes();
  const [search, setSearch] = useState('');
  const [discipline, setDiscipline] = useState<DisciplineFilter>('all');

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filtered = athletes.filter((a) => {
    if (discipline !== 'all' && a.gender !== discipline) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const nameMatch = a.name.toLowerCase().includes(q);
      const natMatch = a.nationality?.toLowerCase().includes(q);
      if (!nameMatch && !natMatch) return false;
    }
    return true;
  });

  const decCount = athletes.filter((a) => a.gender === 'male').length;
  const hepCount = athletes.filter((a) => a.gender === 'female').length;

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
        className="flex items-center gap-2.5"
        style={{
          padding: 10, border: '1px solid var(--line)',
          borderRadius: 10, background: 'var(--surface)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--muted-2)', marginLeft: 4 }}>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or country..."
          className="flex-1 text-sm"
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'inherit', color: 'var(--ink)',
          }}
        />
        <div className="flex gap-1" style={{ background: 'var(--bg)', padding: 3, borderRadius: 8 }}>
          {([['all', 'All'], ['male', 'Decathlon'], ['female', 'Heptathlon']] as const).map(
            ([value, label]) => (
              <button
                key={value}
                onClick={() => setDiscipline(value)}
                style={{
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
