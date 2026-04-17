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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Athletes</h1>
        <Link
          to="/athletes/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          Add Athlete
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or nationality..."
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden text-sm shrink-0">
          {([['all', 'All'], ['male', 'Decathlon'], ['female', 'Heptathlon']] as const).map(
            ([value, label]) => (
              <button
                key={value}
                onClick={() => setDiscipline(value)}
                className={`px-3 py-2 font-medium transition-colors ${
                  discipline === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : (
        <>
          {athletes.length > 0 && filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
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
