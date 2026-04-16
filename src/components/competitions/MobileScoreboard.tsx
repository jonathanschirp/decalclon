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

function positionBadge(pos: number): string {
  if (pos === 1) return 'bg-yellow-400 text-yellow-900';
  if (pos === 2) return 'bg-gray-300 text-gray-800';
  if (pos === 3) return 'bg-orange-300 text-orange-900';
  return 'bg-slate-200 text-slate-700';
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

  const scores = useMemo(() => sortAndRank(baseScores, sortMode), [baseScores, sortMode]);
  const athleteMap = useMemo(() => new Map(athletes.map((a) => [a.id, a])), [athletes]);

  const cellBg = (score: AthleteScore, event: EventDefinition): string => {
    const es = score.eventScores[event.id];
    if (es?.isDNS) return 'bg-red-50 border-red-300';
    if (!es || es.performance == null || !es.isActual) return 'bg-white';
    const athlete = athleteMap.get(score.athleteId);
    if (athlete && isPersonalBest(athlete, event.id, es.performance, event)) {
      return 'bg-green-50 border-green-300';
    }
    return 'bg-white';
  };

  return (
    <div className="space-y-3">
      {/* Full-width segmented sort toggle */}
      <div className="grid grid-cols-2 rounded-lg border border-gray-300 overflow-hidden text-sm">
        <button
          onClick={() => setSortMode('predicted')}
          className={`py-2 font-medium transition-colors ${
            sortMode === 'predicted'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600'
          }`}
        >
          Sort by Predicted
        </button>
        <button
          onClick={() => setSortMode('current')}
          className={`py-2 font-medium transition-colors ${
            sortMode === 'current'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600'
          }`}
        >
          Sort by Current
        </button>
      </div>

      <div className="space-y-2">
        {scores.map((score) => {
          const expanded = expandedId === score.athleteId;
          const completedCount = events.filter(
            (e) => score.eventScores[e.id]?.isActual,
          ).length;

          return (
            <div
              key={score.athleteId}
              className={`bg-white border rounded-lg overflow-hidden shadow-sm ${
                score.withdrawn
                  ? 'border-red-200 opacity-60'
                  : 'border-gray-200'
              }`}
            >
              {/* Card header — tap to expand */}
              <button
                type="button"
                onClick={() =>
                  setExpandedId(expanded ? null : score.athleteId)
                }
                className="w-full flex items-center gap-3 p-3 text-left active:bg-gray-50"
              >
                {score.withdrawn ? (
                  <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-red-100 text-red-600">
                    DNF
                  </div>
                ) : (
                  <div
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-base ${positionBadge(score.position)}`}
                  >
                    {score.position}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold truncate ${score.withdrawn ? 'line-through text-gray-500' : ''}`}>
                    {score.athleteName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {completedCount}/{events.length} events completed
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {score.withdrawn ? (
                    <div className="text-base font-semibold text-gray-400 leading-tight">
                      {score.totalActualPoints}
                    </div>
                  ) : (
                    <>
                      <div
                        className={
                          sortMode === 'predicted'
                            ? 'text-xl font-bold text-blue-900 leading-tight'
                            : 'text-base font-semibold text-gray-900 leading-tight'
                        }
                      >
                        {score.predictedFinalScore}
                      </div>
                      <div
                        className={
                          sortMode === 'current'
                            ? 'text-sm font-bold text-blue-700'
                            : 'text-xs text-gray-500'
                        }
                      >
                        {score.totalActualPoints} current
                      </div>
                    </>
                  )}
                </div>
                <svg
                  className={`shrink-0 w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Expanded area — event grid */}
              {expanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-3 grid grid-cols-2 gap-2">
                  {events.map((event) => {
                    const es = score.eventScores[event.id];
                    const isCurrent = currentEvent?.id === event.id;
                    const isEditing =
                      editingCell?.athleteId === score.athleteId &&
                      editingCell?.eventId === event.id;

                    if (isEditing) {
                      return (
                        <div
                          key={event.id}
                          className="col-span-2 bg-white p-3 rounded border-2 border-blue-500"
                        >
                          <div className="text-xs font-semibold uppercase text-gray-600 mb-2">
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
                          onClick={() =>
                            setEditingCell({ athleteId: score.athleteId, eventId: event.id })
                          }
                          className="relative p-2 rounded border border-red-300 bg-red-50 cursor-pointer active:bg-red-100"
                        >
                          <div className="text-[10px] font-semibold uppercase text-gray-500 truncate">
                            {event.name}
                          </div>
                          <div className="text-sm font-bold text-red-500">DNS</div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onResultReset(score.athleteId, event.id);
                            }}
                            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-xs text-gray-400 active:text-red-600 active:bg-red-50 rounded"
                            aria-label="Reset to PB"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={event.id}
                        onClick={() =>
                          setEditingCell({ athleteId: score.athleteId, eventId: event.id })
                        }
                        className={`relative p-2 rounded border cursor-pointer active:bg-gray-100 ${
                          isCurrent ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'
                        } ${cellBg(score, event)}`}
                      >
                        <div className="text-[10px] font-semibold uppercase text-gray-500 truncate">
                          {event.name}
                        </div>
                        {es && es.performance != null ? (
                          <>
                            <div
                              className={`text-sm ${es.isActual ? 'font-semibold text-gray-900' : 'italic text-gray-400'}`}
                            >
                              {formatPerformance(event, es.performance)}
                            </div>
                            <div
                              className={`text-xs ${es.isActual ? 'text-gray-600' : 'text-gray-400'}`}
                            >
                              {es.points} pts
                            </div>
                            {es.isActual && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onResultReset(score.athleteId, event.id);
                                }}
                                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-xs text-gray-400 active:text-red-600 active:bg-red-50 rounded"
                                aria-label="Reset to PB"
                              >
                                ✕
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-gray-300">—</div>
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
    </div>
  );
}
