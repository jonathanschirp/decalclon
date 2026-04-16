import { Link } from 'react-router-dom';
import type { Athlete } from '../../types';

interface Props {
  athletes: Athlete[];
}

export function AthleteList({ athletes }: Props) {
  if (athletes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No athletes yet.</p>
        <Link to="/athletes/new" className="text-blue-600 hover:underline mt-2 inline-block">
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
            <tr className="border-b border-gray-200 text-left">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Discipline</th>
              <th className="px-4 py-3 font-semibold">Nationality</th>
              <th className="px-4 py-3 font-semibold text-right">PB</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((athlete) => (
              <tr key={athlete.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/athletes/${athlete.id}`} className="text-blue-600 hover:underline font-medium">
                    {athlete.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {athlete.gender === 'male' ? 'Decathlon' : 'Heptathlon'}
                </td>
                <td className="px-4 py-3 text-gray-600">{athlete.nationality || '—'}</td>
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
            className="block bg-white border border-gray-200 rounded-lg p-3 active:bg-gray-50"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-blue-700 truncate">{athlete.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {athlete.gender === 'male' ? 'Decathlon' : 'Heptathlon'}
                  {athlete.nationality && ` · ${athlete.nationality}`}
                </div>
              </div>
              {athlete.combinedPB != null && (
                <div className="shrink-0 text-right">
                  <div className="font-mono font-bold text-gray-900">{athlete.combinedPB}</div>
                  <div className="text-[10px] uppercase text-gray-500">PB</div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
