import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAthletes } from '../hooks/useAthletes';
import { useCompetitions } from '../hooks/useCompetition';
import { getCompetitionStatus } from '../lib/competitionStatus';

export function Dashboard() {
  const { athletes, fetch: fetchAthletes } = useAthletes();
  const { competitions, fetch: fetchCompetitions } = useCompetitions();

  useEffect(() => {
    fetchAthletes();
    fetchCompetitions();
  }, [fetchAthletes, fetchCompetitions]);

  const activeComps = competitions.filter((c) => getCompetitionStatus(c.date) === 'in_progress');
  const upcomingComps = competitions.filter((c) => getCompetitionStatus(c.date) === 'upcoming');
  const completedComps = competitions.filter((c) => getCompetitionStatus(c.date) === 'completed');

  const hasCompetitions = competitions.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="micro" style={{ color: 'var(--muted-2)', marginBottom: 6 }}>01 · COMPETITIONS</div>
          <h1 className="display" style={{ fontSize: 36, fontWeight: 700, margin: 0, letterSpacing: '-.025em' }}>
            Season ledger
          </h1>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>
            <span className="tnum" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{athletes.length}</span> athletes &middot;{' '}
            <span className="tnum" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{competitions.length}</span> competitions
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/athletes/new"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ border: '1px solid var(--line)', color: 'var(--ink-2)', background: 'var(--surface)' }}
          >
            Add Athlete
          </Link>
          <Link
            to="/competitions/new"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'var(--ink)', color: '#fff' }}
          >
            + New Competition
          </Link>
        </div>
      </div>

      {/* Live competitions — hero cards */}
      {activeComps.length > 0 && (
        <section>
          {activeComps.map((comp) => (
            <Link
              key={comp.id}
              to={`/competitions/${comp.id}`}
              className="block overflow-hidden"
              style={{
                position: 'relative',
                background: 'var(--ink)', color: '#fff',
                borderRadius: 14, padding: '24px 28px',
              }}
            >
              {/* Lane stripes decoration */}
              <div aria-hidden="true" style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 160px, rgba(255,255,255,.04) 160px 161px)',
                pointerEvents: 'none',
              }} />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="live-dot inline-block" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--live)' }} />
                    <span className="micro" style={{ color: 'rgba(255,255,255,.5)', letterSpacing: '.12em' }}>LIVE</span>
                  </div>
                  <div className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.1 }}>
                    {comp.name}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,.6)', marginTop: 6, fontSize: 14 }}>
                    {comp.date}{comp.location && ` · ${comp.location}`} · {comp.athleteIds.length} athletes
                  </div>
                </div>
              </div>
              <div className="relative mt-4">
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.55)' }}>
                  View scoreboard →
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* Upcoming */}
      {upcomingComps.length > 0 && (
        <section>
          <div className="micro" style={{ color: 'var(--muted-2)', marginBottom: 14, letterSpacing: '.08em' }}>
            UPCOMING · {String(upcomingComps.length).padStart(2, '0')}
          </div>
          <div
            className="overflow-hidden"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 10 }}
          >
            {upcomingComps.map((comp) => (
              <Link
                key={comp.id}
                to={`/competitions/${comp.id}`}
                className="block"
                style={{ background: 'var(--surface)', padding: 20 }}
              >
                <div className="micro" style={{ color: 'var(--muted-2)', marginBottom: 6 }}>
                  {comp.type.toUpperCase()} · {comp.athleteIds.length} ATHLETES
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.015em' }}>{comp.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{comp.location}</div>
                <div className="tnum" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  {comp.date}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completedComps.length > 0 && (
        <section>
          <div className="micro" style={{ color: 'var(--muted-2)', marginBottom: 14, letterSpacing: '.08em' }}>
            COMPLETED · {String(completedComps.length).padStart(2, '0')}
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
            {completedComps.map((comp, i) => (
              <Link
                key={comp.id}
                to={`/competitions/${comp.id}`}
                className="flex items-center justify-between gap-4"
                style={{
                  padding: '14px 20px',
                  borderBottom: i < completedComps.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{comp.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {comp.date}{comp.location && ` · ${comp.location}`} · {comp.type}
                  </div>
                </div>
                <span style={{ color: 'var(--muted-2)', fontSize: 14 }}>→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!hasCompetitions && (
        <div className="text-center py-16">
          <div className="display" style={{ fontSize: 48, color: 'var(--line-2)', marginBottom: 16 }}>&#9776;</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>No competitions yet</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
            Create your first competition or import one from World Athletics.
          </p>
          <Link
            to="/competitions/new"
            className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--ink)', color: '#fff' }}
          >
            New Competition
          </Link>
        </div>
      )}
    </div>
  );
}
