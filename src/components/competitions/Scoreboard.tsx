import { useState, useMemo } from 'react';
import type { Competition, Athlete, AthleteScore, EventDefinition } from '../../types';
import { getEventsForType } from '../../lib/events';
import { formatPerformance } from '../../lib/scoring';
import { calculatePredictedScores, getCurrentEvent, isPersonalBest } from '../../lib/predictions';
import { PerformanceInput } from '../common/PerformanceInput';

type SortMode = 'predicted' | 'current';

interface Props {
  competition: Competition;
  athletes: Athlete[];
  onResultEntered: (athleteId: string, eventId: string, value: number) => void;
  onResultReset: (athleteId: string, eventId: string) => void;
}

function positionMedal(pos: number): string {
  if (pos === 1) return 'bg-yellow-100 text-yellow-900';
  if (pos === 2) return 'bg-gray-100 text-gray-700';
  if (pos === 3) return 'bg-orange-100 text-orange-800';
  return '';
}

function eventRank(scores: AthleteScore[], eventId: string): Map<string, number> {
  const ranked = scores
    .filter((s) => s.eventScores[eventId]?.isActual)
    .sort((a, b) => b.eventScores[eventId].points - a.eventScores[eventId].points);
  const map = new Map<string, number>();
  ranked.forEach((s, i) => map.set(s.athleteId, i + 1));
  return map;
}

function sortAndRank(scores: AthleteScore[], mode: SortMode): AthleteScore[] {
  const sorted = [...scores].sort((a, b) =>
    mode === 'predicted'
      ? b.predictedFinalScore - a.predictedFinalScore
      : b.totalActualPoints - a.totalActualPoints,
  );
  sorted.forEach((score, index) => {
    score.position = index + 1;
  });
  return sorted;
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

  const cellBg = (
    score: AthleteScore,
    event: EventDefinition,
  ): string => {
    const es = score.eventScores[event.id];
    if (!es || es.performance == null) return 'bg-gray-50';
    if (!es.isActual) return 'bg-gray-50';

    const athlete = athleteMap.get(score.athleteId);
    if (athlete && es.performance != null && isPersonalBest(athlete, event.id, es.performance, event)) {
      return 'bg-green-50';
    }

    const rank = eventRanks.get(event.id)?.get(score.athleteId);
    if (rank === 1) return 'bg-yellow-50';
    if (rank === 2) return 'bg-gray-50';
    if (rank === 3) return 'bg-amber-50';

    return 'bg-white';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          <button
            onClick={() => setSortMode('predicted')}
            className={`px-3 py-1.5 font-medium transition-colors ${
              sortMode === 'predicted'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Predicted
          </button>
          <button
            onClick={() => setSortMode('current')}
            className={`px-3 py-1.5 font-medium transition-colors ${
              sortMode === 'current'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Current
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="text-sm border-collapse min-w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 text-white">
              <th className="sticky left-0 z-20 bg-slate-800 px-3 py-2 text-left font-semibold w-8">#</th>
              <th className="sticky left-8 z-20 bg-slate-800 px-3 py-2 text-left font-semibold min-w-[140px]">Athlete</th>
              {events.map((event) => (
                <th
                  key={event.id}
                  className={`px-3 py-2 text-center font-semibold min-w-[100px] ${
                    currentEvent?.id === event.id ? 'bg-blue-700' : ''
                  }`}
                >
                  <div className="text-xs">{event.name}</div>
                  {currentEvent?.id === event.id && (
                    <div className="text-[10px] font-normal opacity-75">Current</div>
                  )}
                </th>
              ))}
              <th className={`sticky right-[100px] z-20 px-3 py-2 text-center font-semibold min-w-[80px] ${sortMode === 'current' ? 'bg-blue-900' : 'bg-slate-900'}`}>
                Current
              </th>
              <th className={`sticky right-0 z-20 px-3 py-2 text-center font-semibold min-w-[100px] ${sortMode === 'predicted' ? 'bg-blue-900' : 'bg-slate-900'}`}>
                Predicted
              </th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score) => (
              <tr key={score.athleteId} className="border-b border-gray-200 hover:bg-blue-50/30">
                <td className={`sticky left-0 z-10 px-3 py-2 text-center font-bold ${positionMedal(score.position)}`}>
                  {score.position}
                </td>
                <td className="sticky left-8 z-10 bg-white px-3 py-2 font-medium whitespace-nowrap">
                  {score.athleteName}
                </td>
                {events.map((event) => {
                  const es = score.eventScores[event.id];
                  const isEditing =
                    editingCell?.athleteId === score.athleteId && editingCell?.eventId === event.id;

                  if (isEditing) {
                    return (
                      <td key={event.id} className="px-2 py-1">
                        <PerformanceInput
                          event={event}
                          value={es?.performance}
                          autoFocus
                          onChange={(val) => {
                            onResultEntered(score.athleteId, event.id, val);
                            setEditingCell(null);
                          }}
                          onCancel={() => setEditingCell(null)}
                        />
                      </td>
                    );
                  }

                  return (
                    <td
                      key={event.id}
                      className={`px-3 py-2 text-center ${cellBg(score, event)} group relative`}
                    >
                      {es && es.performance != null ? (
                        <div
                          className="cursor-pointer"
                          onClick={() => setEditingCell({ athleteId: score.athleteId, eventId: event.id })}
                        >
                          <div className={es.isActual ? 'font-semibold' : 'italic text-gray-400'}>
                            {formatPerformance(event, es.performance)}
                          </div>
                          <div className={`text-xs ${es.isActual ? 'text-gray-700' : 'text-gray-400'}`}>
                            {es.points} pts
                          </div>
                          {es.isActual && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onResultReset(score.athleteId, event.id);
                              }}
                              className="absolute top-0.5 right-0.5 hidden group-hover:inline-flex items-center justify-center w-5 h-5 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Reset to PB"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ) : (
                        <span
                          className="text-gray-300 cursor-pointer"
                          onClick={() => setEditingCell({ athleteId: score.athleteId, eventId: event.id })}
                        >
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className={`sticky right-[100px] z-10 px-3 py-2 text-center font-mono font-semibold ${sortMode === 'current' ? 'bg-blue-50 text-blue-900 text-lg font-bold' : 'bg-white'}`}>
                  {score.totalActualPoints}
                </td>
                <td className={`sticky right-0 z-10 px-3 py-2 text-center font-mono ${sortMode === 'predicted' ? 'font-bold text-lg text-blue-900 bg-blue-50' : 'font-semibold bg-white'}`}>
                  {score.predictedFinalScore}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
