import { Link } from 'react-router-dom';
import type { Competition } from '../../types';

interface Props {
  competitions: Competition[];
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

const statusLabels: Record<string, string> = {
  upcoming: 'Upcoming',
  in_progress: 'Live',
  completed: 'Completed',
};

export function CompetitionList({ competitions }: Props) {
  if (competitions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg">No competitions yet.</p>
        <Link to="/competitions/new" className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
          Create your first competition
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {competitions.map((comp) => (
        <Link
          key={comp.id}
          to={`/competitions/${comp.id}`}
          className="group block p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
        >
          <div className="flex items-start justify-between mb-2 gap-2">
            <h3 className="font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{comp.name}</h3>
            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${statusColors[comp.status]}`}>
              {statusLabels[comp.status]}
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
            <div>{comp.date}</div>
            {comp.location && <div>{comp.location}</div>}
            <div className="capitalize">{comp.type} &middot; {comp.athleteIds.length} athletes</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
