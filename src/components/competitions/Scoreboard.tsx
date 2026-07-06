import { useState, useMemo } from 'react';
import type { Competition, Athlete, AthleteScore, EventDefinition } from '../../types';
import { getEventsForType } from '../../lib/events';
import { formatPerformance } from '../../lib/scoring';
import { calculatePredictedScores, getCurrentEvent, isPersonalBest, DNS_MARK } from '../../lib/predictions';
import { PerformanceInput } from '../common/PerformanceInput';

type SortMode = 'predicted' | 'current';

interface Props {
  competition: Competition;
  athletes: Athlete[];
  onResultEntered: (athleteId: string, eventId: string, value: number) => void;
  onResultReset: (athleteId: string, eventId: string) => void;
}

/** Short event codes for compact display */
const EVENT_CODES: Record<string, string> = {
  dec_100m: '100M', dec_long_jump: 'LJ', dec_shot_put: 'SP', dec_high_jump: 'HJ',
  dec_400m: '400M', dec_110m_hurdles: '110H', dec_discus: 'DT', dec_pole_vault: 'PV',
  dec_javelin: 'JT', dec_1500m: '1500',
  hep_100m_hurdles: '100H', hep_high_jump: 'HJ', hep_shot_put: 'SP', hep_200m: '200M',
  hep_long_jump: 'LJ', hep_javelin: 'JT', hep_800m: '800M',
};

function eventRank(scores: AthleteScore[], eventId: string): Map<string, number> {
  const ranked = scores
    .filter((s) => s.eventScores[eventId]?.isActual && !s.eventScores[eventId]?.isDNS)
    .sort((a, b) => b.eventScores[eventId].points - a.eventScores[eventId].points);
  const map = new Map<string, number>();
  ranked.forEach((s, i) => map.set(s.athleteId, i + 1));
  return map;
}

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

function PosBadge({ pos }: { pos: number }) {
  const bg = pos === 1 ? 'var(--gold)' : pos === 2 ? 'var(--silver)' : pos === 3 ? 'var(--bronze)' : '#fff';
  const fg = pos <= 3 ? '#fff' : 'var(--ink)';
  const border = pos <= 3 ? bg : 'var(--line)';
  return (
    <span
      className="num inline-flex items-center justify-center"
      style={{ width: 26, height: 26, fontSize: 13, fontWeight: 700, background: bg, color: fg, border: `1px solid ${border}`, borderRadius: 6 }}
    >
      {pos}
    </span>
  );
}

function EventRail({ events, currentEvent }: { events: EventDefinition[]; currentEvent: EventDefinition | null }) {
  return (
    <div className="grid overflow-hidden bg-white border rounded-[10px]" style={{ gridTemplateColumns: `repeat(${events.length}, 1fr)`, borderColor: 'var(--line)' }}>
      {events.map((e, i) => {
        const isCurrent = currentEvent?.id === e.id;
        const isDone = currentEvent ? e.order < currentEvent.order : false;
        const isUpcoming = currentEvent ? e.order > currentEvent.order : true;
        return (
          <div key={e.id} className="relative py-3 px-2.5" style={{ borderRight: i < events.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <div className="flex items-center justify-between gap-1">
              <span className="micro" style={{ color: isCurrent ? 'var(--live)' : 'var(--muted-2)' }}>
                {String(e.order).padStart(2, '0')}
              </span>
              {isDone && (
                <span className="inline-flex items-center justify-center rounded-full" style={{ width: 14, height: 14, background: 'var(--ink)', color: '#fff', fontSize: 9 }}>
                  ✓
                </span>
              )}
              {isCurrent && (
                <span className="inline-flex items-center gap-1">
                  <span className="live-dot" style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--live)' }} />
                  <span style={{ color: 'var(--live)', fontWeight: 700, fontSize: 10, letterSpacing: '.1em' }}>LIVE</span>
                </span>
              )}
              {isUpcoming && <span className="text-[11px]" style={{ color: 'var(--muted-2)' }}>—</span>}
            </div>
            <div className="num mt-1" style={{ fontSize: 15, fontWeight: 700, color: isUpcoming ? 'var(--muted)' : 'var(--ink)' }}>
              {EVENT_CODES[e.id] ?? e.name}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)', lineHeight: 1.1 }}>
              {isDone ? 'complete' : isCurrent ? 'in progress' : 'scheduled'}
            </div>
            {isCurrent && <div className="absolute left-0 right-0 bottom-0 h-[3px]" style={{ background: 'var(--live)' }} />}
            {isDone && <div className="absolute left-0 right-0 bottom-0 h-[3px]" style={{ background: 'var(--ink)' }} />}
          </div>
        );
      })}
    </div>
  );
}

export function Scoreboard({ competition, athletes, onResultEntered, onResultReset }: Props) {
  const events = getEventsForType(competition.type);
  const currentEvent = getCurrentEvent(competition);
  const baseScores = useMemo(
    () => calculatePredictedScores(competition, athletes),
    [competition, athletes],
  );

  const [sortMode, setSortMode] = useState<SortMode>('predicted');
  const [editingCell, setEditingCell] = useState<{ athleteId: string; eventId: string } | null>(null);

  const scores = useMemo(() => sortAndRank(baseScores, sortMode), [baseScores, sortMode]);

  const athleteMap = useMemo(() => new Map(athletes.map((a) => [a.id, a])), [athletes]);

  const eventRanks = useMemo(
    () => new Map(events.map((e) => [e.id, eventRank(scores, e.id)])),
    [events, scores],
  );

  const maxPred = useMemo(
    () => Math.max(...scores.filter((s) => !s.withdrawn).map((s) => s.predictedFinalScore), 0),
    [scores],
  );

  const maxCurrent = useMemo(
    () => Math.max(...scores.filter((s) => !s.withdrawn).map((s) => s.totalActualPoints), 0),
    [scores],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Event progress rail */}
      <EventRail events={events} currentEvent={currentEvent} />

      {/* Sort toggle */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-3.5">
          <span className="micro" style={{ color: 'var(--muted-2)' }}>RANK BY</span>
          <div className="inline-flex bg-white p-[3px] gap-0.5 rounded-lg" style={{ border: '1px solid var(--line)' }}>
            <button
              onClick={() => setSortMode('current')}
              className="py-1.5 px-3 text-xs font-semibold rounded-md border-none cursor-pointer transition-colors"
              style={{
                background: sortMode === 'current' ? 'var(--ink)' : 'transparent',
                color: sortMode === 'current' ? '#fff' : 'var(--muted)',
              }}
            >
              Current standing
            </button>
            <button
              onClick={() => setSortMode('predicted')}
              className="py-1.5 px-3 text-xs font-semibold rounded-md border-none cursor-pointer transition-colors"
              style={{
                background: sortMode === 'predicted' ? 'var(--ink)' : 'transparent',
                color: sortMode === 'predicted' ? '#fff' : 'var(--muted)',
              }}
            >
              Predicted final
            </button>
          </div>
        </div>
        <span className="text-[11px] hidden sm:block" style={{ color: 'var(--muted)' }}>Click any cell to enter result</span>
      </div>

      {/* The table */}
      <div className="nice-scroll overflow-x-auto bg-white rounded-[10px]" style={{ border: '1px solid var(--line)' }}>
        <table className="text-sm min-w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-[3] w-[44px] py-2.5 px-2 text-center bg-white" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="micro" style={{ color: 'var(--muted-2)' }}>#</span>
              </th>
              <th className="sticky left-[44px] z-[3] min-w-[200px] py-2.5 px-2.5 text-left bg-white" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="micro" style={{ color: 'var(--muted-2)' }}>ATHLETE</span>
              </th>
              {events.map((event) => {
                const isCurrent = currentEvent?.id === event.id;
                const isDone = currentEvent ? event.order < currentEvent.order : false;
                return (
                  <th
                    key={event.id}
                    className="relative py-2.5 px-2 min-w-[100px] text-center"
                    style={{
                      background: isCurrent ? 'var(--live)' : '#fff',
                      borderBottom: isCurrent ? '1px solid var(--live)' : '1px solid var(--line)',
                    }}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="micro" style={{ opacity: 0.7, letterSpacing: '.08em', color: isCurrent ? '#fff' : 'var(--muted-2)' }}>
                        {String(event.order).padStart(2, '0')}
                      </span>
                      <span className="num" style={{ fontSize: 14, fontWeight: 700, color: isCurrent ? '#fff' : 'var(--ink)' }}>
                        {EVENT_CODES[event.id] ?? event.name}
                      </span>
                    </div>
                    {isCurrent && (
                      <div className="absolute bottom-[-1px] left-0 right-0 micro py-[2px]" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.18em', background: 'var(--live)', color: '#fff' }}>
                        ▼ CURRENT
                      </div>
                    )}
                    {isDone && <div className="absolute left-0 right-0 bottom-0 h-[2px]" style={{ background: 'var(--ink)' }} />}
                  </th>
                );
              })}
              <th
                className="sticky right-[116px] z-[3] py-2.5 px-2 text-center"
                style={{
                  boxSizing: 'border-box',
                  width: 100, minWidth: 100, maxWidth: 100,
                  background: sortMode === 'current' ? 'var(--ink)' : '#fff',
                  borderBottom: sortMode === 'current' ? '1px solid var(--ink)' : '1px solid var(--line)',
                  borderLeft: '1px solid var(--line)',
                  boxShadow: '-4px 0 8px -2px rgba(14,16,20,.08)',
                }}
              >
                <span className="micro" style={{ color: sortMode === 'current' ? '#fff' : 'var(--muted-2)', letterSpacing: '.14em', fontWeight: sortMode === 'current' ? 700 : 400 }}>CURRENT</span>
              </th>
              <th
                className="sticky right-0 z-[3] py-2.5 px-2.5 text-center"
                style={{
                  boxSizing: 'border-box',
                  width: 116, minWidth: 116, maxWidth: 116,
                  background: sortMode === 'predicted' ? 'var(--ink)' : '#fff',
                  borderBottom: sortMode === 'predicted' ? '1px solid var(--ink)' : '1px solid var(--line)',
                  borderLeft: sortMode === 'predicted' ? '2px solid var(--ink)' : '1px solid var(--line)',
                }}
              >
                <span className="micro" style={{ color: sortMode === 'predicted' ? '#fff' : 'var(--muted-2)', letterSpacing: '.14em', fontWeight: sortMode === 'predicted' ? 700 : 400 }}>PREDICTED</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, idx) => {
              const isLast = idx === scores.length - 1;
              const cellBd = isLast ? 'none' : '1px solid var(--line)';
              const athlete = athleteMap.get(score.athleteId);
              const gap = sortMode === 'predicted'
                ? maxPred - score.predictedFinalScore
                : maxCurrent - score.totalActualPoints;

              return (
                <tr key={score.athleteId} style={{ height: 54, opacity: score.withdrawn ? 0.55 : 1 }}>
                  {/* Position */}
                  <td className="sticky left-0 z-[2] px-2 py-1.5 text-center bg-white" style={{ borderBottom: cellBd }}>
                    {score.withdrawn ? (
                      <span className="num text-[11px] font-bold" style={{ color: 'var(--live)' }}>DNF</span>
                    ) : (
                      <PosBadge pos={score.position} />
                    )}
                  </td>

                  {/* Athlete name */}
                  <td className="sticky left-[44px] z-[2] px-2.5 py-1.5 bg-white" style={{ borderBottom: cellBd, borderRight: '1px solid var(--line)' }}>
                    <div className="flex items-center gap-2.5">
                      {athlete?.nationality && (
                        <span className="mono inline-flex items-center justify-center shrink-0" style={{ width: 26, height: 16, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', background: '#fff', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 3 }}>
                          {athlete.nationality.slice(0, 3).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="whitespace-nowrap text-sm" style={{ fontWeight: 600, color: score.withdrawn ? 'var(--muted-2)' : 'var(--ink)', textDecoration: score.withdrawn ? 'line-through' : 'none' }}>
                          {score.athleteName}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Event cells */}
                  {events.map((event) => {
                    const es = score.eventScores[event.id];
                    const isCurrent = currentEvent?.id === event.id;
                    const isFuture = currentEvent ? event.order > currentEvent.order : false;
                    const isEditing = editingCell?.athleteId === score.athleteId && editingCell?.eventId === event.id;
                    const rank = eventRanks.get(event.id)?.get(score.athleteId);
                    const isPB = athlete && es?.isActual && es.performance != null && isPersonalBest(athlete, event.id, es.performance, event);

                    // Cell background
                    let bgColor = '#fff';
                    if (isCurrent) bgColor = 'rgba(232,57,45,.04)';
                    if (isFuture) bgColor = 'var(--bg)';
                    if (isPB) bgColor = 'rgba(11,138,62,.07)';
                    if (rank === 1 && es?.isActual && !isPB) bgColor = 'rgba(200,160,71,.10)';
                    if (es?.isDNS) bgColor = 'var(--live-soft)';

                    const cellBorderLeft = isCurrent ? '1px solid rgba(232,57,45,.25)' : '1px solid var(--line)';

                    if (isEditing) {
                      return (
                        <td key={event.id} className="px-2 py-1" style={{ borderBottom: cellBd, borderLeft: cellBorderLeft, background: bgColor }}>
                          <PerformanceInput
                            event={event}
                            value={es?.performance}
                            autoFocus
                            onChange={(val) => { onResultEntered(score.athleteId, event.id, val); setEditingCell(null); }}
                            onDNS={() => { onResultEntered(score.athleteId, event.id, DNS_MARK); setEditingCell(null); }}
                            onCancel={() => setEditingCell(null)}
                          />
                        </td>
                      );
                    }

                    // No-mark cell
                    if (es?.isDNS) {
                      return (
                        <td key={event.id} className="group relative px-2.5 py-2 text-center" style={{ background: bgColor, borderBottom: cellBd, borderLeft: cellBorderLeft }}>
                          <div className="cursor-pointer" onClick={() => setEditingCell({ athleteId: score.athleteId, eventId: event.id })}>
                            <span className="text-xs font-bold" style={{ color: 'var(--live)' }}>NM</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onResultReset(score.athleteId, event.id); }}
                            className="absolute top-0.5 right-0.5 hidden group-hover:inline-flex items-center justify-center w-5 h-5 text-xs rounded"
                            style={{ color: 'var(--muted-2)' }}
                            title="Reset to PB"
                          >
                            ✕
                          </button>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={event.id}
                        className={`group relative px-2.5 py-2 text-center align-middle ${!es?.isActual && es?.performance != null ? 'diag-stripe' : ''}`}
                        style={{ background: bgColor, borderBottom: cellBd, borderLeft: cellBorderLeft }}
                      >
                        {es && es.performance != null ? (
                          <div className="cursor-pointer relative" onClick={() => setEditingCell({ athleteId: score.athleteId, eventId: event.id })}>
                            <div className="num" style={{ fontSize: es.isActual ? 15 : 14, fontWeight: es.isActual ? 700 : 400, lineHeight: 1.1, color: isPB ? 'var(--pb)' : es.isActual ? 'var(--ink)' : 'var(--muted)', fontStyle: es.isActual ? 'normal' : 'italic' }}>
                              {formatPerformance(event, es.performance)}
                            </div>
                            <div className="tnum mt-0.5" style={{ fontSize: 11, color: es.isActual ? 'var(--muted)' : 'var(--muted-2)' }}>
                              {es.points} pts
                            </div>
                            {/* PB tag */}
                            {isPB && (
                              <div className="absolute -top-1 -right-1 rounded" style={{ background: 'var(--pb)', color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '.04em', padding: '1px 4px' }}>
                                PB↑
                              </div>
                            )}
                            {/* Event win tag */}
                            {rank === 1 && es.isActual && !isPB && (
                              <div className="absolute -top-1 -right-1 rounded" style={{ background: 'var(--gold)', color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '.04em', padding: '1px 4px' }}>
                                #1
                              </div>
                            )}
                            {/* Reset button */}
                            {es.isActual && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onResultReset(score.athleteId, event.id); }}
                                className="absolute top-0.5 left-0.5 hidden group-hover:inline-flex items-center justify-center w-5 h-5 text-xs rounded"
                                style={{ color: 'var(--muted-2)' }}
                                title="Reset to PB"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer text-sm"
                            style={{ color: 'var(--muted-2)' }}
                            onClick={() => setEditingCell({ athleteId: score.athleteId, eventId: event.id })}
                          >
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Current total */}
                  <td
                    className="sticky right-[116px] z-[2] px-2 py-1.5 text-center"
                    style={{
                      boxSizing: 'border-box',
                      width: 100, minWidth: 100, maxWidth: 100,
                      background: sortMode === 'current' ? '#FBFAF4' : '#fff',
                      borderLeft: sortMode === 'current' ? '2px solid var(--ink)' : '1px solid var(--line)',
                      borderBottom: cellBd,
                      boxShadow: '-4px 0 8px -2px rgba(14,16,20,.08)',
                    }}
                  >
                    {score.withdrawn ? (
                      <span className="num" style={{ fontSize: sortMode === 'current' ? 22 : 18, color: 'var(--muted-2)' }}>—</span>
                    ) : (
                      sortMode === 'current' ? (
                        <>
                          <div className="num tnum" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                            {score.totalActualPoints || '—'}
                          </div>
                          <div className="tnum mt-0.5" style={{ fontSize: 11, fontWeight: 600, color: gap === 0 ? 'var(--pb)' : 'var(--muted)' }}>
                            {gap === 0 ? 'LEADER' : `−${gap}`}
                          </div>
                        </>
                      ) : (
                        <div className="num tnum" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-2)' }}>
                          {score.totalActualPoints || '—'}
                        </div>
                      )
                    )}
                  </td>

                  {/* Predicted total */}
                  <td
                    className="sticky right-0 z-[2] px-2.5 py-1.5 text-center"
                    style={{
                      boxSizing: 'border-box',
                      width: 116, minWidth: 116, maxWidth: 116,
                      background: sortMode === 'predicted' ? '#FBFAF4' : '#fff',
                      borderLeft: sortMode === 'predicted' ? '2px solid var(--ink)' : '1px solid var(--line)',
                      borderBottom: cellBd,
                      /* no shadow needed — CURRENT column shadow covers this */
                    }}
                  >
                    {score.withdrawn ? (
                      <span className="num" style={{ fontSize: sortMode === 'predicted' ? 22 : 18, color: 'var(--muted-2)' }}>—</span>
                    ) : (
                      sortMode === 'predicted' ? (
                        <>
                          <div className="num tnum" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                            {score.predictedFinalScore}
                          </div>
                          <div className="tnum mt-0.5" style={{ fontSize: 11, fontWeight: 600, color: gap === 0 ? 'var(--pb)' : 'var(--muted)' }}>
                            {gap === 0 ? 'LEADER' : `−${gap}`}
                          </div>
                        </>
                      ) : (
                        <div className="num tnum" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-2)' }}>
                          {score.predictedFinalScore}
                        </div>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-6 flex-wrap items-center text-xs" style={{ color: 'var(--muted)' }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'var(--live)' }} />
          Current event
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'var(--pb)' }} />
          Personal best
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'var(--gold)' }} />
          Event win
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="diag-stripe w-3.5 h-2.5 inline-block rounded-sm" style={{ border: '1px solid var(--line)' }} />
          Projected from PB
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-2.5 inline-block rounded-sm" style={{ background: 'var(--live-soft)', border: '1px solid #F0C9C3' }} />
          No mark (NM)
        </span>
      </div>
    </div>
  );
}
