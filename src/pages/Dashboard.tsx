import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAthletes } from '../hooks/useAthletes';
import { useCompetitions } from '../hooks/useCompetition';

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

export function Dashboard() {
  const { athletes, fetch: fetchAthletes } = useAthletes();
  const { competitions, fetch: fetchCompetitions } = useCompetitions();

  useEffect(() => {
    fetchAthletes();
    fetchCompetitions();
  }, [fetchAthletes, fetchCompetitions]);

  const activeComps = competitions.filter((c) => c.status === 'in_progress');
  const upcomingComps = competitions.filter((c) => c.status === 'upcoming');
  const completedComps = competitions.filter((c) => c.status === 'completed');

  const hasCompetitions = competitions.length > 0;

  return (
    <div className="space-y-8">
      {/* Hero / welcome */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Competitions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {athletes.length} athletes &middot; {competitions.length} competitions
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/athletes/new"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Add Athlete
          </Link>
          <Link
            to="/competitions/new"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            New Competition
          </Link>
        </div>
      </div>

      {/* Active competitions — primary focus */}
      {activeComps.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3">
            Live
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeComps.map((comp) => (
              <Link
                key={comp.id}
                to={`/competitions/${comp.id}`}
                className="group block p-5 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800/50 rounded-xl hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {comp.name}
                  </h3>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${statusColors[comp.status]}`}>
                    Live
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
                  <div>{comp.date}{comp.location && ` \u00B7 ${comp.location}`}</div>
                  <div className="capitalize">{comp.type} &middot; {comp.athleteIds.length} athletes</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcomingComps.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            Upcoming
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingComps.map((comp) => (
              <Link
                key={comp.id}
                to={`/competitions/${comp.id}`}
                className="group block p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h3 className="font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {comp.name}
                  </h3>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${statusColors[comp.status]}`}>
                    Upcoming
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {comp.date}{comp.location && ` \u00B7 ${comp.location}`}
                  <span className="capitalize"> &middot; {comp.type} &middot; {comp.athleteIds.length} athletes</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completedComps.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            Completed
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completedComps.map((comp) => (
              <Link
                key={comp.id}
                to={`/competitions/${comp.id}`}
                className="group block p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h3 className="font-semibold text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {comp.name}
                  </h3>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${statusColors[comp.status]}`}>
                    Done
                  </span>
                </div>
                <div className="text-sm text-gray-400 dark:text-gray-500">
                  {comp.date}{comp.location && ` \u00B7 ${comp.location}`}
                  <span className="capitalize"> &middot; {comp.type}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!hasCompetitions && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4 text-gray-300 dark:text-gray-700">&#9776;</div>
          <h2 className="text-lg font-semibold mb-1">No competitions yet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Create your first competition or import one from World Athletics.
          </p>
          <Link
            to="/competitions/new"
            className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            New Competition
          </Link>
        </div>
      )}
    </div>
  );
}
