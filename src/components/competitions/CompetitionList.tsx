import { Link } from 'react-router-dom';
import type { Competition } from '../../types';

interface Props {
  competitions: Competition[];
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

const statusLabels: Record<string, string> = {
  upcoming: 'Upcoming',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export function CompetitionList({ competitions }: Props) {
  if (competitions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No competitions yet.</p>
        <Link to="/competitions/new" className="text-blue-600 hover:underline mt-2 inline-block">
          Create your first competition
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {competitions.map((comp) => (
        <Link
          key={comp.id}
          to={`/competitions/${comp.id}`}
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{comp.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[comp.status]}`}>
              {statusLabels[comp.status]}
            </span>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <div>{comp.date}</div>
            {comp.location && <div>{comp.location}</div>}
            <div className="capitalize">{comp.type} — {comp.athleteIds.length} athletes</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
