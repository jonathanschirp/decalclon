import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Athlete } from '../../types';
import { getEventsForType } from '../../lib/events';
import { calculatePoints, formatPerformance } from '../../lib/scoring';

interface Props {
  athlete: Athlete;
  peers: Athlete[];
  onDelete: () => void;
}

export function AthleteProfile({ athlete, peers, onDelete }: Props) {
  const events = getEventsForType(athlete.gender === 'male' ? 'decathlon' : 'heptathlon');

  const eventPoints = events.map((event) => {
    const pb = athlete.personalBests[event.id];
    return { event, pb, points: pb != null ? calculatePoints(event, pb) : 0 };
  });

  const totalPoints = eventPoints.reduce((sum, ep) => sum + ep.points, 0);

  // Per-event average points across all peers (same gender) who have a PB for that event
  const peerAvg = useMemo(() => {
    const avg: Record<string, number> = {};
    for (const event of events) {
      const peerPoints: number[] = [];
      for (const p of peers) {
        const pb = p.personalBests[event.id];
        if (pb != null) peerPoints.push(calculatePoints(event, pb));
      }
      // Include the athlete themselves in the average
      const athletePb = athlete.personalBests[event.id];
      if (athletePb != null) peerPoints.push(calculatePoints(event, athletePb));
      avg[event.id] = peerPoints.length > 0 ? peerPoints.reduce((s, v) => s + v, 0) / peerPoints.length : 0;
    }
    return avg;
  }, [events, peers, athlete]);

  function getTag(eventId: string, points: number): 'strength' | 'weakness' | 'neutral' {
    const avg = peerAvg[eventId];
    if (points <= 0 || avg <= 0) return 'neutral';
    const deviation = (points - avg) / avg;
    if (deviation >= 0.06) return 'strength';
    if (deviation <= -0.06) return 'weakness';
    return 'neutral';
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <Link to="/athletes" className="hover:underline">Athletes</Link>
        <span style={{ color: 'var(--muted-2)' }}>/</span>
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{athlete.name}</span>
      </div>

      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4" style={{ paddingBottom: 22, borderBottom: '1px solid var(--line)' }}>
        <div>
          <div className="flex items-center gap-2.5" style={{ marginBottom: 10 }}>
            {athlete.nationality && (
              <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                {athlete.nationality}
              </span>
            )}
            <span className="micro" style={{ color: 'var(--muted-2)' }}>
              {(athlete.gender === 'male' ? 'DECATHLON' : 'HEPTATHLON')}
            </span>
          </div>
          <h1 className="display" style={{ fontSize: 42, fontWeight: 700, margin: 0, letterSpacing: '-.03em', lineHeight: 1 }}>
            {athlete.name}
          </h1>
          {athlete.waAthleteId && (
            <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
              World Athletics ID {athlete.waAthleteId}
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <Link
            to={`/athletes/${athlete.id}?edit=true`}
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'var(--ink)', color: '#fff' }}
          >
            Edit
          </Link>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'var(--live-soft)', color: 'var(--live)' }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* PB module */}
      <div
        className="overflow-hidden"
        style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
          background: 'var(--line)', border: '1px solid var(--line)',
          borderRadius: 12,
        }}
      >
        <div style={{ background: 'var(--surface)', padding: '16px 20px' }}>
          <div className="micro" style={{ color: 'var(--muted-2)' }}>
            {athlete.gender === 'male' ? 'DECATHLON' : 'HEPTATHLON'} PB
          </div>
          <div className="num" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, marginTop: 4 }}>
            {athlete.combinedPB ?? '—'}
          </div>
        </div>
        <div style={{ background: 'var(--bg)', padding: '16px 20px' }}>
          <div className="micro" style={{ color: 'var(--muted-2)' }}>SUM OF EVENT PBs</div>
          <div className="num" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>
            {totalPoints}
          </div>
          {athlete.combinedPB != null && totalPoints > 0 && (
            <div style={{ fontSize: 11, color: 'var(--pb)', marginTop: 4, fontWeight: 600 }}>
              {Math.round((athlete.combinedPB / totalPoints) * 100)}% conversion
            </div>
          )}
        </div>
      </div>

      {/* Event cards */}
      <div>
        <div className="micro" style={{ color: 'var(--muted-2)', marginBottom: 14, letterSpacing: '.08em' }}>
          PERSONAL BESTS · BY EVENT
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {eventPoints.map(({ event, pb, points }) => {
            const avg = peerAvg[event.id];
            const tag = getTag(event.id, points);
            const tagColor = tag === 'strength' ? 'var(--pb)' : tag === 'weakness' ? 'var(--live)' : 'var(--muted-2)';
            const diff = avg > 0 ? Math.round(points - avg) : 0;
            return (
              <div
                key={event.id}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  borderRadius: 10, padding: '14px 14px 12px',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="micro" style={{ color: 'var(--muted-2)' }}>
                    {String(event.order).padStart(2, '0')}
                  </span>
                  {points > 0 && (
                    <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: tagColor }}>
                      {tag}
                    </span>
                  )}
                </div>
                <div className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginTop: 4 }}>
                  {event.name}
                </div>
                <div className="num" style={{ fontSize: 24, fontWeight: 800, marginTop: 8, letterSpacing: '-.01em' }}>
                  {pb != null ? formatPerformance(event, pb) : '—'}
                </div>
                {points > 0 && (
                  <>
                    <div style={{ position: 'relative', marginTop: 10, height: 4, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: avg > 0 ? `${Math.min(100, (points / avg) * 50)}%` : '50%',
                        background: tagColor,
                      }} />
                    </div>
                    <div className="flex justify-between" style={{ marginTop: 6 }}>
                      <span className="tnum" style={{ fontSize: 10, color: 'var(--muted)' }}>{points} pts</span>
                      {avg > 0 && (
                        <span className="tnum" style={{ fontSize: 10, color: diff > 0 ? 'var(--pb)' : diff < 0 ? 'var(--live)' : 'var(--muted-2)' }}>
                          {diff > 0 ? '+' : ''}{diff} vs peers
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
