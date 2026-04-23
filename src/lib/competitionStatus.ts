import type { CompetitionStatus } from '../types';

/**
 * Derive competition status from its start date.
 * Combined events (decathlon/heptathlon) span two days,
 * so both the start date and the day after count as in_progress.
 */
export function getCompetitionStatus(date: string): CompetitionStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day1 = new Date(date + 'T00:00:00');
  const day2 = new Date(day1);
  day2.setDate(day2.getDate() + 1);

  const t = today.getTime();
  if (t === day1.getTime() || t === day2.getTime()) return 'in_progress';
  if (day1 > today) return 'upcoming';
  return 'completed';
}
