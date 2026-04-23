import { Link } from 'react-router-dom';
import type { Athlete } from '../../types';

interface Props {
  athletes: Athlete[];
}

export function AthleteList({ athletes }: Props) {
  if (athletes.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
        <p style={{ fontSize: 16 }}>No athletes yet.</p>
        <Link to="/athletes/new" style={{ color: 'var(--brand)', marginTop: 8 }} className="inline-block hover:underline">
          Add your first athlete
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div
        className="hidden sm:grid gap-4"
        style={{
          gridTemplateColumns: '44px 2fr 1fr 100px 24px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg)',
        }}
      >
        <div className="micro" style={{ color: 'var(--muted-2)' }}>#</div>
        <div className="micro" style={{ color: 'var(--muted-2)' }}>ATHLETE</div>
        <div className="micro" style={{ color: 'var(--muted-2)' }}>DISCIPLINE</div>
        <div className="micro" style={{ color: 'var(--muted-2)', textAlign: 'right' }}>PB</div>
        <div />
      </div>

      {/* Rows */}
      {athletes.map((athlete, i) => (
        <Link
          key={athlete.id}
          to={`/athletes/${athlete.id}`}
          className="block sm:grid gap-4 items-center"
          style={{
            gridTemplateColumns: '44px 2fr 1fr 100px 24px',
            padding: '12px 16px',
            borderBottom: i < athletes.length - 1 ? '1px solid var(--line)' : 'none',
          }}
        >
          {/* Row number — desktop */}
          <div className="hidden sm:block num tnum" style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted-2)' }}>
            {String(i + 1).padStart(2, '0')}
          </div>

          {/* Name + nationality */}
          <div className="flex items-center gap-2.5 min-w-0">
            {athlete.nationality && (
              <span className="mono shrink-0" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                {athlete.nationality}
              </span>
            )}
            <div className="min-w-0">
              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {athlete.name}
              </div>
              {/* Mobile: show discipline + PB inline */}
              <div className="sm:hidden" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {athlete.gender === 'male' ? 'Decathlon' : 'Heptathlon'}
                {athlete.combinedPB != null && (
                  <span className="num tnum" style={{ marginLeft: 8, fontWeight: 700, color: 'var(--ink)' }}>
                    {athlete.combinedPB}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Discipline — desktop */}
          <div className="hidden sm:block" style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>
            {athlete.gender === 'male' ? 'Decathlon' : 'Heptathlon'}
          </div>

          {/* PB — desktop */}
          <div className="hidden sm:block num tnum" style={{ textAlign: 'right', fontWeight: 700, fontSize: 16 }}>
            {athlete.combinedPB != null ? athlete.combinedPB : '—'}
          </div>

          {/* Arrow */}
          <div className="hidden sm:block" style={{ color: 'var(--muted-2)', fontSize: 14, textAlign: 'right' }}>→</div>
        </Link>
      ))}
    </div>
  );
}
