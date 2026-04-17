import { Link } from 'react-router-dom';
import type { Athlete } from '../../types';
import { getEventsForType } from '../../lib/events';
import { calculatePoints, formatPerformance } from '../../lib/scoring';

interface Props {
  athlete: Athlete;
  onDelete: () => void;
}

export function AthleteProfile({ athlete, onDelete }: Props) {
  const events = getEventsForType(athlete.gender === 'male' ? 'decathlon' : 'heptathlon');

  const totalPoints = events.reduce((sum, event) => {
    const pb = athlete.personalBests[event.id];
    return sum + (pb != null ? calculatePoints(event, pb) : 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{athlete.name}</h1>
          <div className="flex gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span>{athlete.gender === 'male' ? 'Decathlon' : 'Heptathlon'}</span>
            {athlete.nationality && <span>{athlete.nationality}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            to={`/athletes/${athlete.id}?edit=true`}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {athlete.combinedPB != null && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {athlete.gender === 'male' ? 'Decathlon' : 'Heptathlon'} PB
            </div>
            <div className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">{athlete.combinedPB}</div>
          </div>
        )}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Sum of Event PBs</div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{totalPoints}</div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Personal Bests</h2>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                <th className="px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Event</th>
                <th className="px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400 text-right">Performance</th>
                <th className="px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const pb = athlete.personalBests[event.id];
                const points = pb != null ? calculatePoints(event, pb) : null;
                return (
                  <tr key={event.id} className="border-b border-gray-100 dark:border-gray-800/50">
                    <td className="px-4 py-2.5 font-medium">{event.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700 dark:text-gray-300">
                      {pb != null ? formatPerformance(event, pb) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">
                      {points ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-bold border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2.5">Total</td>
                <td></td>
                <td className="px-4 py-2.5 text-right font-mono">{totalPoints}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
