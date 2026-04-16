import { Timestamp } from 'firebase/firestore';

export type Gender = 'male' | 'female';
export type CompetitionType = 'decathlon' | 'heptathlon';
export type CompetitionStatus = 'upcoming' | 'in_progress' | 'completed';
export type EventType = 'track' | 'field';
export type MeasurementUnit = 'seconds' | 'meters';

export interface Athlete {
  id: string;
  name: string;
  gender: Gender;
  nationality?: string;
  dateOfBirth?: string;
  personalBests: Record<string, number>;
  seasonBests?: Record<string, number>;
  notes?: string;
  combinedPB?: number;
  waAthleteId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Competition {
  id: string;
  name: string;
  date: string;
  location?: string;
  type: CompetitionType;
  status: CompetitionStatus;
  athleteIds: string[];
  results: CompetitionResults;
  waCompetitionId?: number;
  waEventId?: number;
  waAthleteMap?: Record<string, string>;
  createdAt: Timestamp;
}

export interface CompetitionResults {
  [athleteId: string]: {
    [eventId: string]: number | null;
  };
}

export interface EventDefinition {
  id: string;
  name: string;
  type: EventType;
  measurementUnit: MeasurementUnit;
  higherIsBetter: boolean;
  scoringConstants: { A: number; B: number; C: number };
  competitionType: CompetitionType;
  order: number;
}

export interface AthleteScore {
  athleteId: string;
  athleteName: string;
  eventScores: Record<string, { performance: number | null; points: number; isActual: boolean; isDNS: boolean }>;
  totalActualPoints: number;
  predictedFinalScore: number;
  position: number;
  previousPosition?: number;
  withdrawn: boolean;
}
