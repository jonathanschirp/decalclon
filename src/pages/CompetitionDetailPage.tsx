import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useCompetitions } from '../hooks/useCompetition';
import { useAthletes } from '../hooks/useAthletes';
import { Scoreboard } from '../components/competitions/Scoreboard';
import { MobileScoreboard } from '../components/competitions/MobileScoreboard';
import { CompetitionForm } from '../components/competitions/CompetitionForm';

const statusBadge: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};
const statusLabels: Record<string, string> = {
  upcoming: 'Upcoming',
  in_progress: 'Live',
  completed: 'Completed',
};

export function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';
  const isEdit = searchParams.get('edit') === 'true';
  const { current, fetchOne, updateResult, resetResult, syncFromWA, syncing } = useCompetitions();
  const { athletes, fetch: fetchAthletes } = useAthletes();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      Promise.all([fetchOne(id), fetchAthletes()]).then(() => setLoaded(true));
    }
  }, [id, isNew, fetchOne, fetchAthletes]);

  if (isNew) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">New Competition</h1>
        <CompetitionForm />
      </div>
    );
  }

  if (!loaded) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!current) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Competition not found.</div>;

  if (isEdit) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Edit Competition</h1>
        <CompetitionForm competition={current} />
      </div>
    );
  }

  const enrolledAthletes = athletes.filter((a) => current.athleteIds.includes(a.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{current.name}</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${statusBadge[current.status]}`}>
              {statusLabels[current.status]}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span>{current.date}</span>
            {current.location && <span>{current.location}</span>}
            <span className="capitalize">{current.type}</span>
            <span>{enrolledAthletes.length} athletes</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {current.waCompetitionId && (
            <button
              onClick={syncFromWA}
              disabled={syncing}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {syncing ? 'Syncing...' : 'Sync from WA'}
            </button>
          )}
          <Link
            to={`/competitions/${current.id}?edit=true`}
            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {enrolledAthletes.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No athletes enrolled.{' '}
          <Link to={`/competitions/${current.id}?edit=true`} className="text-blue-600 dark:text-blue-400 hover:underline">
            Edit competition to add athletes.
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Scoreboard
              competition={current}
              athletes={enrolledAthletes}
              onResultEntered={(athleteId, eventId, value) => {
                updateResult(current.id, athleteId, eventId, value);
              }}
              onResultReset={(athleteId, eventId) => {
                resetResult(current.id, athleteId, eventId);
              }}
            />
          </div>
          <div className="md:hidden">
            <MobileScoreboard
              competition={current}
              athletes={enrolledAthletes}
              onResultEntered={(athleteId, eventId, value) => {
                updateResult(current.id, athleteId, eventId, value);
              }}
              onResultReset={(athleteId, eventId) => {
                resetResult(current.id, athleteId, eventId);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
