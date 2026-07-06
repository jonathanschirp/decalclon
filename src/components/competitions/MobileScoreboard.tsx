import { useState, useMemo } from 'react';
import type { Competition, Athlete, AthleteScore } from '../../types';
import { getEventsForType } from '../../lib/events';
import { formatPerformance } from '../../lib/scoring';
import { calculatePredictedScores, getCurrentEvent, isPersonalBest, DNS_MARK } from '../../lib/predictions';
import { PerformanceInput } from '../common/PerformanceInput';
import { DisciplineEntryView } from './DisciplineEntryView';

type SortMode = 'predicted' | 'current';

interface Props {
  competition: Competition;
  athletes: Athlete[];
  onResultEntered: (athleteId: string, eventId: string, value: number) => void;
  onResultReset: (athleteId: string, eventId: string) => void;
}

const EVENT_CODES: Record<string, string> = {
  dec_100m: '100M', dec_long_jump: 'LJ', dec_shot_put: 'SP', dec_high_jump: 'HJ',
  dec_400m: '400M', dec_110m_hurdles: '110H', dec_discus: 'DT', dec_pole_vault: 'PV',
  dec_javelin: 'JT', dec_1500m: '1500',
  hep_100m_hurdles: '100H', hep_high_jump: 'HJ', hep_shot_put: 'SP', hep_200m: '200M',
  hep_long_jump: 'LJ', hep_javelin: 'JT', hep_800m: '800M',
};

function sortAndRank(scores: AthleteScore[], mode: SortMode): AthleteScore[] {
  const sorted = [...scores].sort((a, b) => {
    if (a.withdrawn !== b.withdrawn) return a.withdrawn ? 1 : -1;
    return mode === 'predicted'
      ? b.predictedFinalScore - a.predictedFinalScore
      : b.totalActualPoints - a.totalActualPoints;
  });
  let pos = 1;
  sorted.forEach((score) => {
    score.position = score.withdrawn ? 0 : pos++;
  });
  return sorted;
}

function medalStripeColor(pos: number): string | undefined {
  if (pos === 1) return 'var(--gold)';
  if (pos === 2) return 'var(--silver)';
  if (pos === 3) return 'var(--bronze)';
  return undefined;
}

export function MobileScoreboard({
  competition,
  athletes,
  onResultEntered,
  onResultReset,
}: Props) {
  const events = getEventsForType(competition.type);
  const currentEvent = getCurrentEvent(competition);
  const baseScores = useMemo(
    () => calculatePredictedScores(competition, athletes),
    [competition, athletes],
  );

  const [sortMode, setSortMode] = useState<SortMode>('predicted');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ athleteId: string; eventId: string } | null>(null);
  const [disciplineViewIndex, setDisciplineViewIndex] = useState<number | null>(null);

  const scores = useMemo(() => sortAndRank(baseScores, sortMode), [baseScores, sortMode]);
  const athleteMap = useMemo(() => new Map(athletes.map((a) => [a.id, a])), [athletes]);

  // Primary score follows the active sort; the other is shown below.
  const primaryScore = (s: AthleteScore) =>
    sortMode === 'predicted' ? s.predictedFinalScore : s.totalActualPoints;
  const secondaryScore = (s: AthleteScore) =>
    sortMode === 'predicted' ? s.totalActualPoints : s.predictedFinalScore;
  const secondaryLabel = sortMode === 'predicted' ? 'now' : 'proj';
  const maxScore = useMemo(() => Math.max(...scores.map(primaryScore)), [scores, sortMode]);

  const completedCount = (score: AthleteScore) =>
    events.filter((e) => score.eventScores[e.id]?.isActual).length;

  // Rank per-event for WIN tags
  const eventRanks = useMemo(() => {
    const evs = getEventsForType(competition.type);
    const map: Record<string, Map<string, number>> = {};
    for (const e of evs) {
      const ranked = scores
        .filter((s) => s.eventScores[e.id]?.isActual && !s.eventScores[e.id]?.isDNS)
        .sort((a, b) => b.eventScores[e.id].points - a.eventScores[e.id].points);
      const m = new Map<string, number>();
      ranked.forEach((s, i) => m.set(s.athleteId, i + 1));
      map[e.id] = m;
    }
    return map;
  }, [scores, competition.type]);

  return (
    <div className="flex flex-col gap-0">
      {/* Current event strip — dark bar, tap to open discipline entry */}
      {currentEvent && (
        <button
          type="button"
          className="w-full text-left flex items-center justify-between"
          onClick={() => setDisciplineViewIndex(currentEvent.order - 1)}
          style={{ padding: '10px 14px', background: 'var(--ink)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <div>
            <div className="micro" style={{ color: 'rgba(255,255,255,.5)', letterSpacing: '.12em' }}>
              NOW · {String(currentEvent.order).padStart(2, '0')} OF {events.length}
            </div>
            <div className="num" style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
              {currentEvent.name}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--live)' }} />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(255,255,255,.5)' }}>
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </button>
      )}

      {/* Sort toggle */}
      <div className="flex gap-1.5" style={{ padding: '10px 12px', background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
        {(['predicted', 'current'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            style={{
              flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600,
              border: sortMode === mode ? '1px solid var(--ink)' : '1px solid var(--line)',
              background: sortMode === mode ? 'var(--ink)' : '#fff',
              color: sortMode === mode ? '#fff' : 'var(--ink-2)',
              borderRadius: 8, cursor: 'pointer',
            }}
          >
            {mode === 'predicted' ? 'Predicted' : 'Current'}
          </button>
        ))}
      </div>

      {/* Cards list */}
      <div className="flex flex-col gap-1.5" style={{ padding: 10 }}>
        {scores.map((score) => {
          const expanded = expandedId === score.athleteId;
          const done = completedCount(score);
          const stripe = medalStripeColor(score.position);
          const gap = score.position === 1 ? 0 : maxScore - primaryScore(score);

          return (
            <div
              key={score.athleteId}
              style={{
                background: '#fff',
                border: '1px solid var(--line)',
                borderLeft: stripe ? `3px solid ${stripe}` : '1px solid var(--line)',
                borderRadius: 8,
                overflow: 'hidden',
                opacity: score.withdrawn ? 0.55 : 1,
              }}
            >
              {/* Card header */}
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : score.athleteId)}
                className="w-full text-left"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr auto 14px',
                  gap: 10,
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {/* Position */}
                {score.withdrawn ? (
                  <span className="num" style={{ fontSize: 11, fontWeight: 700, color: 'var(--live)' }}>DNF</span>
                ) : (
                  <span
                    className="num inline-flex items-center justify-center"
                    style={{
                      width: 26, height: 26, fontSize: 12, fontWeight: 700,
                      background: score.position <= 3 ? medalStripeColor(score.position) : '#fff',
                      color: score.position <= 3 ? '#fff' : 'var(--ink)',
                      border: `1px solid ${score.position <= 3 ? medalStripeColor(score.position) : 'var(--line)'}`,
                      borderRadius: 6,
                    }}
                  >
                    {score.position}
                  </span>
                )}

                {/* Name + metadata */}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14, fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      textDecoration: score.withdrawn ? 'line-through' : 'none',
                    }}
                  >
                    {score.athleteName}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 6 }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{done}</span>
                    <span style={{ color: 'var(--muted-2)' }}>/{events.length}</span>
                  </div>
                </div>

                {/* Scores */}
                <div style={{ textAlign: 'right', lineHeight: 1 }}>
                  {score.withdrawn ? (
                    <span className="num" style={{ fontSize: 18, fontWeight: 800, color: 'var(--muted-2)' }}>—</span>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 5 }}>
                        <span className="tnum" style={{ fontSize: 10, color: score.position === 1 ? 'var(--pb)' : 'var(--muted)', fontWeight: 600 }}>
                          {score.position === 1 ? 'LEADER' : `−${gap}`}
                        </span>
                        <span className="num" style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
                          {primaryScore(score)}
                        </span>
                      </div>
                      <div className="tnum" style={{ fontSize: 10, marginTop: 3, color: 'var(--muted-2)', fontWeight: 600 }}>
                        {secondaryScore(score)} {secondaryLabel}
                      </div>
                    </>
                  )}
                </div>

                {/* Chevron */}
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: 'var(--muted-2)' }}
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              {/* Expanded event grid */}
              {expanded && (
                <div
                  style={{
                    borderTop: '1px solid var(--line)',
                    background: 'var(--bg)',
                    padding: 10,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                  }}
                >
                  {events.map((event) => {
                    const es = score.eventScores[event.id];
                    const isCurrent = currentEvent?.id === event.id;
                    const isEditing =
                      editingCell?.athleteId === score.athleteId &&
                      editingCell?.eventId === event.id;
                    const athlete = athleteMap.get(score.athleteId);
                    const isPB = athlete && es?.isActual && es.performance != null && !es.isDNS &&
                      isPersonalBest(athlete, event.id, es.performance, event);
                    const rank = eventRanks[event.id]?.get(score.athleteId);
                    const isWin = rank === 1 && es?.isActual && !isPB;

                    if (isEditing) {
                      return (
                        <div
                          key={event.id}
                          className="col-span-2"
                          style={{ background: '#fff', padding: 12, borderRadius: 6, border: '2px solid var(--brand)' }}
                        >
                          <div className="micro" style={{ color: 'var(--muted)', marginBottom: 8 }}>
                            {event.name}
                          </div>
                          <PerformanceInput
                            event={event}
                            value={es?.performance}
                            autoFocus
                            onChange={(val) => {
                              onResultEntered(score.athleteId, event.id, val);
                              setEditingCell(null);
                            }}
                            onDNS={() => {
                              onResultEntered(score.athleteId, event.id, DNS_MARK);
                              setEditingCell(null);
                            }}
                            onCancel={() => setEditingCell(null)}
                          />
                        </div>
                      );
                    }

                    // DNS cell
                    if (es?.isDNS) {
                      return (
                        <div
                          key={event.id}
                          onClick={() => setEditingCell({ athleteId: score.athleteId, eventId: event.id })}
                          style={{
                            position: 'relative', padding: '7px 9px', borderRadius: 6,
                            border: '1px solid var(--live)', background: 'var(--live-soft)', cursor: 'pointer',
                          }}
                        >
                          <div className="micro" style={{ color: 'var(--muted-2)' }}>
                            {String(event.order).padStart(2, '0')}
                          </div>
                          <div className="num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--live)', marginTop: 3 }}>NM</div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onResultReset(score.athleteId, event.id); }}
                            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-xs rounded"
                            style={{ color: 'var(--muted-2)' }}
                            aria-label="Reset"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={event.id}
                        onClick={() => setEditingCell({ athleteId: score.athleteId, eventId: event.id })}
                        className={!es?.isActual ? 'diag-stripe' : ''}
                        style={{
                          position: 'relative', padding: '7px 9px', borderRadius: 6, cursor: 'pointer',
                          border: isCurrent ? '1px solid var(--live)' : '1px solid var(--line)',
                          background: isPB ? 'var(--pb-soft)' : '#fff',
                        }}
                      >
                        <div>
                          <span className="micro" style={{ color: isCurrent ? 'var(--live)' : 'var(--muted-2)' }}>
                            {String(event.order).padStart(2, '0')} · {EVENT_CODES[event.id] || event.name}
                          </span>
                          {isCurrent && <span className="micro" style={{ color: 'var(--live)', fontWeight: 700, marginLeft: 6 }}>LIVE</span>}
                        </div>
                        <div className="num" style={{
                          fontSize: 14, fontWeight: 700, marginTop: 3,
                          color: es?.isActual ? 'var(--ink)' : 'var(--muted)',
                          fontStyle: es?.isActual ? 'normal' : 'italic',
                        }}>
                          {es && es.performance != null ? formatPerformance(event, es.performance) : '—'}
                        </div>
                        <div className="tnum" style={{
                          fontSize: 10, marginTop: 1,
                          color: es?.isActual ? 'var(--muted)' : 'var(--muted-2)',
                        }}>
                          {es?.points ?? 0} pts
                          {!es?.isActual && es?.performance != null && <span style={{ marginLeft: 4 }}>· PB</span>}
                          {isWin && <span className="micro" style={{ color: 'var(--gold)', fontWeight: 700, position: 'absolute', bottom: 7, right: 9 }}>#1</span>}
                          {isPB && <span className="micro" style={{ color: 'var(--pb)', fontWeight: 700, position: 'absolute', bottom: 7, right: 9 }}>PB↑</span>}
                        </div>
                        {es?.isActual && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onResultReset(score.athleteId, event.id); }}
                            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-xs rounded"
                            style={{ color: 'var(--muted-2)' }}
                            aria-label="Reset"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Discipline entry overlay */}
      {disciplineViewIndex !== null && (
        <DisciplineEntryView
          competition={competition}
          athletes={athletes}
          scores={scores}
          initialEventIndex={disciplineViewIndex}
          onResultEntered={onResultEntered}
          onResultReset={onResultReset}
          onClose={() => setDisciplineViewIndex(null)}
        />
      )}
    </div>
  );
}
