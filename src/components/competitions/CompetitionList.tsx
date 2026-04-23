import { Link } from 'react-router-dom';
import type { Competition } from '../../types';
import { getCompetitionStatus } from '../../lib/competitionStatus';

interface Props {
  competitions: Competition[];
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  upcoming: { label: 'Upcoming', color: 'var(--brand)', bg: 'var(--brand-soft)' },
  in_progress: { label: 'Live', color: 'var(--live)', bg: 'var(--live-soft)' },
  completed: { label: 'Done', color: 'var(--pb)', bg: 'var(--pb-soft)' },
};

export function CompetitionList({ competitions }: Props) {
  if (competitions.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
        <p style={{ fontSize: 16 }}>No competitions yet.</p>
        <Link to="/competitions/new" style={{ color: 'var(--brand)', marginTop: 8 }} className="inline-block hover:underline">
          Create your first competition
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
      {competitions.map((comp, i) => {
        const derivedStatus = getCompetitionStatus(comp.date);
        const status = statusConfig[derivedStatus];
        return (
          <Link
            key={comp.id}
            to={`/competitions/${comp.id}`}
            className="flex items-center justify-between gap-4"
            style={{
              padding: '14px 20px',
              borderBottom: i < competitions.length - 1 ? '1px solid var(--line)' : 'none',
            }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span style={{ fontWeight: 600 }}>{comp.name}</span>
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
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {comp.date}{comp.location && ` · ${comp.location}`}
                <span className="capitalize"> · {comp.type}</span>
                <span> · {comp.athleteIds.length} athletes</span>
              </div>
            </div>
            <span style={{ color: 'var(--muted-2)', fontSize: 14 }}>→</span>
          </Link>
        );
      })}
    </div>
  );
}
