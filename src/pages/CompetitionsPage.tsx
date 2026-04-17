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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Competitions</h1>
        <Link
          to="/competitions/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          New Competition
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : (
        <CompetitionList competitions={competitions} />
      )}
    </div>
  );
}
