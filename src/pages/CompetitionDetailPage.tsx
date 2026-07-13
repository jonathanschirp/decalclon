import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useCompetitions } from '../hooks/useCompetition';
import { useAthletes } from '../hooks/useAthletes';
import { Scoreboard } from '../components/competitions/Scoreboard';
import { MobileScoreboard } from '../components/competitions/MobileScoreboard';
import { TargetSplits } from '../components/competitions/targetSplits/TargetSplits';
import { CompetitionForm } from '../components/competitions/CompetitionForm';
import { getCompetitionStatus } from '../lib/competitionStatus';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  upcoming: { label: 'Upcoming', color: 'var(--brand)', bg: 'var(--brand-soft)' },
  in_progress: { label: 'Live', color: 'var(--live)', bg: 'var(--live-soft)' },
  completed: { label: 'Done', color: 'var(--pb)', bg: 'var(--pb-soft)' },
};

export function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';
  const isEdit = searchParams.get('edit') === 'true';
  const { current, fetchOne, updateResult, resetResult, syncFromWA, syncing } = useCompetitions();
  const { athletes, fetch: fetchAthletes } = useAthletes();
  const [loaded, setLoaded] = useState(false);
  const [targetAthleteId, setTargetAthleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew && id) {
      Promise.all([fetchOne(id), fetchAthletes()]).then(() => setLoaded(true));
    }
  }, [id, isNew, fetchOne, fetchAthletes]);

  if (isNew) {
    return (
      <div>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 24 }}>
          New Competition
        </h1>
        <CompetitionForm />
      </div>
    );
  }

  if (!loaded) return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading...</div>;
  if (!current) return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Competition not found.</div>;

  if (isEdit) {
    return (
      <div>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 24 }}>
          Edit Competition
        </h1>
        <CompetitionForm competition={current} />
      </div>
    );
  }

  const enrolledAthletes = athletes.filter((a) => current.athleteIds.includes(a.id));
  const derivedStatus = getCompetitionStatus(current.date);
  const status = statusConfig[derivedStatus];
  const targetAthlete = targetAthleteId
    ? enrolledAthletes.find((a) => a.id === targetAthleteId) ?? null
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          {/* Breadcrumb */}
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
            <Link to="/" className="hover:underline">Competitions</Link>
            <span style={{ color: 'var(--muted-2)' }}>/</span>
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{current.name}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="display break-words" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em' }}>
              {current.name}
            </h1>
            <span
              className="micro"
              style={{
                padding: '2px 8px', borderRadius: 4,
                background: status.bg, color: status.color, fontWeight: 700,
              }}
            >
              {status.label}
            </span>
            {derivedStatus === 'in_progress' && (
              <span className="live-dot inline-block" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)' }} />
            )}
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span>{current.date}</span>
            {current.location && <span>· {current.location}</span>}
            <span className="capitalize">· {current.type}</span>
            <span>· {enrolledAthletes.length} athletes</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {current.waCompetitionId && (
            <button
              onClick={syncFromWA}
              disabled={syncing}
              className="px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
              style={{ border: '1px solid var(--line)', color: 'var(--ink-2)', background: 'var(--surface)' }}
            >
              {syncing ? 'Syncing...' : 'Sync from WA'}
            </button>
          )}
          <Link
            to={`/competitions/${current.id}?edit=true`}
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'var(--ink)', color: '#fff' }}
          >
            Edit
          </Link>
        </div>
      </div>

      {enrolledAthletes.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
          No athletes enrolled.{' '}
          <Link to={`/competitions/${current.id}?edit=true`} style={{ color: 'var(--brand)' }} className="hover:underline">
            Edit competition to add athletes.
          </Link>
        </div>
      ) : targetAthlete ? (
        <TargetSplits
          key={targetAthlete.id}
          competition={current}
          athlete={targetAthlete}
          athletes={enrolledAthletes}
          onBack={() => setTargetAthleteId(null)}
          onSwitchAthlete={setTargetAthleteId}
        />
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
              onSetTarget={setTargetAthleteId}
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
              onSetTarget={setTargetAthleteId}
            />
          </div>
        </>
      )}
    </div>
  );
}
