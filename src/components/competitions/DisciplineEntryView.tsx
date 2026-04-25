import { useState, useRef } from 'react';
import type { Competition, Athlete, AthleteScore } from '../../types';
import { getEventsForType } from '../../lib/events';
import { formatPerformance } from '../../lib/scoring';
import { DNS_MARK } from '../../lib/predictions';
import { PerformanceInput } from '../common/PerformanceInput';

interface Props {
  competition: Competition;
  athletes: Athlete[];
  scores: AthleteScore[];
  initialEventIndex: number;
  onResultEntered: (athleteId: string, eventId: string, value: number) => void;
  onResultReset: (athleteId: string, eventId: string) => void;
  onClose: () => void;
}

export function DisciplineEntryView({
  competition,
  athletes,
  scores,
  initialEventIndex,
  onResultEntered,
  onResultReset,
  onClose,
}: Props) {
  const events = getEventsForType(competition.type);
  const [eventIndex, setEventIndex] = useState(initialEventIndex);
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);

  const event = events[eventIndex];
  const athleteMap = new Map(athletes.map((a) => [a.id, a]));

  // Swipe handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swiping = useRef(false);

  const goTo = (dir: -1 | 1) => {
    setEventIndex((i) => Math.max(0, Math.min(events.length - 1, i + dir)));
    setEditingAthleteId(null);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swiping.current = false;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && eventIndex < events.length - 1) goTo(1);
      if (dx > 0 && eventIndex > 0) goTo(-1);
    }
  };

  // Count how many athletes have a result for this event
  const enteredCount = competition.athleteIds.filter(
    (id) => competition.results?.[id]?.[event.id] != null,
  ).length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header with discipline nav */}
      <div style={{ background: 'var(--ink)', color: '#fff', flexShrink: 0 }}>
        {/* Top row: close + title */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '12px 14px 4px' }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,.7)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle', marginRight: 4 }}>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Back
          </button>
          <div className="micro" style={{ color: 'rgba(255,255,255,.5)', letterSpacing: '.12em' }}>
            {enteredCount}/{competition.athleteIds.length} ENTERED
          </div>
        </div>

        {/* Discipline selector with arrows */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '6px 14px 14px' }}
        >
          <button
            type="button"
            onClick={() => goTo(-1)}
            disabled={eventIndex === 0}
            style={{
              background: 'none',
              border: 'none',
              color: eventIndex === 0 ? 'rgba(255,255,255,.2)' : '#fff',
              cursor: eventIndex === 0 ? 'default' : 'pointer',
              padding: 4,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <div className="micro" style={{ color: 'rgba(255,255,255,.5)', letterSpacing: '.12em' }}>
              {String(event.order).padStart(2, '0')} OF {events.length}
            </div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
              {event.name}
            </div>
          </div>

          <button
            type="button"
            onClick={() => goTo(1)}
            disabled={eventIndex === events.length - 1}
            style={{
              background: 'none',
              border: 'none',
              color: eventIndex === events.length - 1 ? 'rgba(255,255,255,.2)' : '#fff',
              cursor: eventIndex === events.length - 1 ? 'default' : 'pointer',
              padding: 4,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1" style={{ paddingBottom: 10 }}>
          {events.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === eventIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === eventIndex ? '#fff' : 'rgba(255,255,255,.25)',
                transition: 'all .2s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Athlete list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        <div className="flex flex-col gap-2">
          {scores.map((score) => {
            const athlete = athleteMap.get(score.athleteId);
            if (!athlete) return null;

            const es = score.eventScores[event.id];
            const hasResult = es?.isActual;
            const isDns = es?.isDNS;
            const isEditing = editingAthleteId === score.athleteId;

            return (
              <div
                key={score.athleteId}
                style={{
                  background: '#fff',
                  border: isEditing ? '2px solid var(--brand)' : '1px solid var(--line)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  opacity: score.withdrawn && !isDns ? 0.5 : 1,
                }}
              >
                {/* Athlete row — tap to edit */}
                <button
                  type="button"
                  className="w-full text-left flex items-center justify-between"
                  onClick={() => setEditingAthleteId(isEditing ? null : score.athleteId)}
                  style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
                    {/* Position badge */}
                    <span
                      className="num inline-flex items-center justify-center"
                      style={{
                        width: 26,
                        height: 26,
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                        background: score.position <= 3 && score.position > 0
                          ? score.position === 1 ? 'var(--gold)' : score.position === 2 ? 'var(--silver)' : 'var(--bronze)'
                          : '#fff',
                        color: score.position <= 3 && score.position > 0 ? '#fff' : 'var(--ink)',
                        border: `1px solid ${score.position <= 3 && score.position > 0
                          ? score.position === 1 ? 'var(--gold)' : score.position === 2 ? 'var(--silver)' : 'var(--bronze)'
                          : 'var(--line)'}`,
                        borderRadius: 6,
                      }}
                    >
                      {score.withdrawn ? '—' : score.position}
                    </span>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {score.athleteName}
                      </div>
                      <div className="num" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                        {score.predictedFinalScore} pts predicted
                      </div>
                    </div>
                  </div>

                  {/* Result display */}
                  <div className="flex items-center gap-2">
                    {isDns ? (
                      <span className="num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--live)' }}>DNS</span>
                    ) : hasResult ? (
                      <div style={{ textAlign: 'right' }}>
                        <div className="num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                          {es.performance != null ? formatPerformance(event, es.performance) : '—'}
                        </div>
                        <div className="tnum" style={{ fontSize: 10, color: 'var(--muted)' }}>
                          {es.points} pts
                        </div>
                      </div>
                    ) : (
                      <span className="num" style={{ fontSize: 13, color: 'var(--muted-2)' }}>—</span>
                    )}
                    {(hasResult || isDns) && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); onResultReset(score.athleteId, event.id); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onResultReset(score.athleteId, event.id); } }}
                        style={{
                          width: 24,
                          height: 24,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          color: 'var(--muted-2)',
                          cursor: 'pointer',
                          borderRadius: 4,
                          flexShrink: 0,
                        }}
                        aria-label="Reset result"
                      >
                        ✕
                      </span>
                    )}
                  </div>
                </button>

                {/* Inline editing area */}
                {isEditing && (
                  <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--line)' }}>
                    <div style={{ paddingTop: 10 }}>
                      <PerformanceInput
                        event={event}
                        value={es?.performance}
                        autoFocus
                        onChange={(val) => {
                          onResultEntered(score.athleteId, event.id, val);
                          setEditingAthleteId(null);
                        }}
                        onDNS={() => {
                          onResultEntered(score.athleteId, event.id, DNS_MARK);
                          setEditingAthleteId(null);
                        }}
                        onCancel={() => setEditingAthleteId(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
