/**
 * Seed Firestore with master data extracted from 2026.xlsx (programs, teachers,
 * classrooms). Idempotent: documents are keyed by their business code, so
 * re-running updates rather than duplicates.
 *
 * Auth: uses the client SDK and signs in with a staff account so the seed obeys
 * the same Firestore rules as the app (no service-account file needed — stays
 * on the free Spark plan).
 *
 * Usage:
 *   SEED_EMAIL=you@example.com SEED_PASSWORD=secret npm run seed
 *   # against emulator:
 *   VITE_USE_EMULATOR=1 SEED_EMAIL=test@test.com SEED_PASSWORD=password npm run seed
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore, setDoc } from 'firebase/firestore';
import type { Classroom, DayGroup, Program, Teacher } from '../src/shared/types';

// --- Minimal .env.local loader (tsx does not auto-load dotenv) ---
function loadEnv() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (const file of ['.env.local', '.env']) {
    try {
      const text = readFileSync(resolve(root, file), 'utf8');
      for (const line of text.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
      }
    } catch {
      /* file may not exist */
    }
  }
}
loadEnv();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

if (process.env.VITE_USE_EMULATOR === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// --- Seed data (from 2026.xlsx) ---

const ALL_DAYS: DayGroup[] = ['MON_WED', 'TUE_THU', 'FRI', 'SAT', 'SUN'];

const programs: Program[] = [
  { code: 'LS', name: 'Little Sparks', minLevel: 1, maxLevel: 5, weekdayDurationMin: 60, color: '#F4B9B9' },
  { code: 'SK', name: 'Sparks Kid', minLevel: 1, maxLevel: 10, weekdayDurationMin: 80, color: '#B9D7F4' },
  { code: 'ST', name: 'Sparks Teen', minLevel: 1, maxLevel: 10, weekdayDurationMin: 80, color: '#C9F4B9' },
];

// worksDayGroups derived from the OFF markers in the "Forming Class New" grid
// (a teacher works a day-group unless their column is marked OFF there). DW & LY
// are in the legend but have no grid columns yet, so they default to all days.
// Adjust any of these later in the Teacher screen.
const teachers: Omit<Teacher, 'id'>[] = [
  { code: 'CC', name: 'Cici', isAssistant: false, active: true, worksDayGroups: ['MON_WED', 'FRI', 'SAT', 'SUN'] },
  { code: 'RR', name: 'Rara', isAssistant: false, active: true, worksDayGroups: ['TUE_THU', 'FRI', 'SAT', 'SUN'] },
  { code: 'TN', name: 'Tintin', isAssistant: false, active: true, worksDayGroups: ['MON_WED', 'FRI', 'SAT', 'SUN'] },
  { code: 'BL', name: 'Bila', isAssistant: false, active: true, worksDayGroups: ['TUE_THU', 'FRI', 'SAT', 'SUN'] },
  { code: 'MO', name: 'Monica', isAssistant: false, active: true, worksDayGroups: ['TUE_THU', 'FRI', 'SAT', 'SUN'] },
  { code: 'NY', name: 'Naya', isAssistant: false, active: true, worksDayGroups: ['TUE_THU', 'FRI', 'SAT', 'SUN'] },
  { code: 'NE', name: 'Nelidya', isAssistant: false, active: true, worksDayGroups: ['MON_WED', 'FRI', 'SAT', 'SUN'] },
  { code: 'FD', name: 'Fida', isAssistant: false, active: true, worksDayGroups: ['MON_WED', 'FRI', 'SAT', 'SUN'] },
  { code: 'NN', name: 'Verina (Nana)', isAssistant: false, active: true, worksDayGroups: ['TUE_THU', 'FRI', 'SAT', 'SUN'] },
  { code: 'BE', name: 'Bella', isAssistant: false, active: true, worksDayGroups: ['MON_WED', 'TUE_THU', 'SAT'] },
  { code: 'MC', name: 'Michelle', isAssistant: true, active: true, worksDayGroups: ['MON_WED', 'TUE_THU', 'SAT'] },
  { code: 'PT', name: 'Putri', isAssistant: true, active: true, worksDayGroups: ['TUE_THU', 'FRI', 'SAT'] },
  // Present as grid columns with real schedules, but names not in the legend.
  { code: 'IV', name: 'IV', isAssistant: false, active: true, worksDayGroups: ['MON_WED', 'TUE_THU', 'SAT'] },
  { code: 'ND', name: 'ND', isAssistant: false, active: true, worksDayGroups: ['TUE_THU', 'SAT', 'SUN'] },
  // In the legend but not yet scheduled in the grid — default to all days.
  { code: 'DW', name: 'Dwi', isAssistant: false, active: true, worksDayGroups: ALL_DAYS },
  { code: 'LY', name: 'Lyly', isAssistant: false, active: true, worksDayGroups: ALL_DAYS },
];

// Students extracted from the "Slot Sparks Session" sheet. Many have no ID yet
// (only a name in the source) — staff can fill IDs later in the Siswa screen.
interface SeedStudent {
  studentCode: string;
  name: string;
  scheduleLabel: string;
}
const students: SeedStudent[] = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'students.seed.json'), 'utf8'),
);

/** Stable, filename-safe doc id from a string (for students lacking an ID). */
function slugId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

const classrooms: Omit<Classroom, 'id'>[] = [
  { code: 'F', name: 'Forest', floor: 'Lt 1' },
  { code: 'J', name: 'Jungle', floor: 'Lt 1' },
  { code: 'TA', name: 'Toucan A', floor: 'Lt 1' },
  { code: 'TC', name: 'Toucan C', floor: 'Lt 1' },
  { code: 'EA', name: 'Elephant A', floor: 'Lt 2' },
  { code: 'EB', name: 'Elephant B', floor: 'Lt 2' },
  { code: 'EC', name: 'Elephant C', floor: 'Lt 2' },
  { code: 'PA', name: 'Penguin A', floor: 'Lt 2' },
  { code: 'PC', name: 'Penguin C', floor: 'Lt 2' },
  { code: 'MA', name: 'Monkey A', floor: 'Lt 2' },
  { code: 'MB', name: 'Monkey B', floor: 'Lt 2' },
];

async function main() {
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;
  if (!email || !password) {
    throw new Error('Set SEED_EMAIL and SEED_PASSWORD env vars (a staff account that can sign in).');
  }
  await signInWithEmailAndPassword(auth, email, password);
  console.log('Signed in as', email);

  for (const p of programs) {
    await setDoc(doc(db, 'programs', p.code), p);
  }
  console.log(`Seeded ${programs.length} programs`);

  for (const t of teachers) {
    await setDoc(doc(db, 'teachers', t.code), t); // keyed by code for idempotency
  }
  console.log(`Seeded ${teachers.length} teachers`);

  for (const c of classrooms) {
    await setDoc(doc(db, 'classrooms', c.code), c);
  }
  console.log(`Seeded ${classrooms.length} classrooms`);

  let n = 0;
  const usedIds = new Set<string>();
  for (const s of students) {
    // Doc id: the student code if present, else a slug of the name (de-duped).
    let id = s.studentCode || slugId(s.name);
    while (usedIds.has(id)) id = `${id}-${usedIds.size}`;
    usedIds.add(id);
    await setDoc(doc(db, 'students', id), {
      studentCode: s.studentCode,
      name: s.name,
      scheduleLabel: s.scheduleLabel,
    });
    n++;
  }
  console.log(`Seeded ${n} students`);

  console.log('Done.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
