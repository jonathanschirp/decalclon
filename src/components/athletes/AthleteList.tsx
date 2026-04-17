import { Link } from 'react-router-dom';
import type { Athlete } from '../../types';

interface Props {
  athletes: Athlete[];
}

export function AthleteList({ athletes }: Props) {
  if (athletes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg">No athletes yet.</p>
        <Link to="/athletes/new" className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
          Add your first athlete
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Name</th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Discipline</th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Nationality</th>
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-right">PB</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((athlete) => (
              <tr key={athlete.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-3">
                  <Link to={`/athletes/${athlete.id}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                    {athlete.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {athlete.gender === 'male' ? 'Decathlon' : 'Heptathlon'}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{athlete.nationality || '—'}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">
                  {athlete.combinedPB != null ? athlete.combinedPB : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {athletes.map((athlete) => (
          <Link
            key={athlete.id}
            to={`/athletes/${athlete.id}`}
            className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 active:bg-gray-50 dark:active:bg-gray-800"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-blue-600 dark:text-blue-400 truncate">{athlete.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {athlete.gender === 'male' ? 'Decathlon' : 'Heptathlon'}
                  {athlete.nationality && ` \u00B7 ${athlete.nationality}`}
                </div>
              </div>
              {athlete.combinedPB != null && (
                <div className="shrink-0 text-right">
                  <div className="font-mono font-bold">{athlete.combinedPB}</div>
                  <div className="text-[10px] uppercase text-gray-500 dark:text-gray-400">PB</div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
