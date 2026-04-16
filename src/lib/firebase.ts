import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import type { Athlete, Competition } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Athletes ---

export async function fetchAthletes(): Promise<Athlete[]> {
  const q = query(collection(db, 'athletes'), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Athlete);
}

export async function fetchAthlete(id: string): Promise<Athlete | null> {
  const snap = await getDoc(doc(db, 'athletes', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Athlete;
}

export async function createAthlete(
  data: Omit<Athlete, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, 'athletes'), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateAthlete(
  id: string,
  data: Partial<Omit<Athlete, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'athletes', id), {
    ...data,
    updatedAt: Timestamp.now(),
  } as DocumentData);
}

export async function deleteAthlete(id: string): Promise<void> {
  await deleteDoc(doc(db, 'athletes', id));
}

// --- Competitions ---

export async function fetchCompetitions(): Promise<Competition[]> {
  const q = query(collection(db, 'competitions'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Competition);
}

export async function fetchCompetition(id: string): Promise<Competition | null> {
  const snap = await getDoc(doc(db, 'competitions', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Competition;
}

export async function createCompetition(
  data: Omit<Competition, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'competitions'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateCompetition(
  id: string,
  data: Partial<Omit<Competition, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'competitions', id), data as DocumentData);
}

export async function deleteCompetition(id: string): Promise<void> {
  await deleteDoc(doc(db, 'competitions', id));
}

export async function fetchAthletesByGender(
  gender: 'male' | 'female',
): Promise<Athlete[]> {
  const q = query(
    collection(db, 'athletes'),
    where('gender', '==', gender),
    orderBy('name'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Athlete);
}
