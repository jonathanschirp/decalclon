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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{athlete.name}</h1>
          <div className="flex gap-4 mt-1 text-sm text-gray-600">
            <span>{athlete.gender === 'male' ? 'Decathlon' : 'Heptathlon'}</span>
            {athlete.nationality && <span>{athlete.nationality}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/athletes/${athlete.id}?edit=true`}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit
          </Link>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {athlete.combinedPB != null && (
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="text-sm text-amber-600 font-medium">
              {athlete.gender === 'male' ? 'Decathlon' : 'Heptathlon'} PB
            </div>
            <div className="text-3xl font-bold text-amber-900">{athlete.combinedPB}</div>
          </div>
        )}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Sum of Event PBs</div>
          <div className="text-3xl font-bold text-blue-900">{totalPoints}</div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Personal Bests</h2>
        <table className="w-full max-w-lg text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="px-3 py-2 font-semibold">Event</th>
              <th className="px-3 py-2 font-semibold text-right">Performance</th>
              <th className="px-3 py-2 font-semibold text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const pb = athlete.personalBests[event.id];
              const points = pb != null ? calculatePoints(event, pb) : null;
              return (
                <tr key={event.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-medium">{event.name}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {pb != null ? formatPerformance(event, pb) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">
                    {points ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="px-3 py-2">Total</td>
              <td></td>
              <td className="px-3 py-2 text-right font-mono">{totalPoints}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
