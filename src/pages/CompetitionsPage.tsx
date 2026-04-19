import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCompetitions } from '../hooks/useCompetition';
import { CompetitionList } from '../components/competitions/CompetitionList';

export function CompetitionsPage() {
  const { competitions, loading, fetch } = useCompetitions();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="micro" style={{ color: 'var(--muted-2)', marginBottom: 6 }}>01 · COMPETITIONS</div>
          <h1 className="display" style={{ fontSize: 36, fontWeight: 700, margin: 0, letterSpacing: '-.025em' }}>
            Competitions
          </h1>
        </div>
        <Link
          to="/competitions/new"
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ background: 'var(--ink)', color: '#fff' }}
        >
          + New Competition
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading...</div>
      ) : (
        <CompetitionList competitions={competitions} />
      )}
    </div>
  );
}
