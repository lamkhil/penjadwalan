# Penjadwalan Kelas — Sparks

Sistem penjadwalan kelas: master data (teacher, ruang, siswa), grid jadwal
seperti `penjadwalan.png`, **conflict guard** (anti-bentrok), dan **guide slot
kosong** saat membuka kelas. Full client-side React + Firebase (gratis / Spark plan).

## Arsitektur
- **React + Vite + TypeScript** SPA → Firebase Hosting
- **Cloud Firestore** = sumber data (teachers/classes/students/enrollments)
- **Firebase Auth** (email/password) = login staf
- **Conflict guard & slot-guide** = modul TS murni (`src/shared/`) yang jalan di
  browser sebelum menulis ke Firestore. Diuji penuh dengan vitest.
- Sync ke Google Sheets via Apps Script = fase lanjutan (seam: `src/shared/sync-contract.ts`).

### Aturan domain inti
- Program: Little Sparks (LS 1–5), Sparks Kid (SK 1–10), Sparks Teen (ST 1–10)
- Hari: Mon&Wed, Tue&Thu, Friday, Saturday, Sunday
- Jam operasional 09:00–18:00
- Durasi otomatis: LS weekday 60' · SK/ST weekday 80' · semua weekend 120' · **kecuali LS 1 weekend 60'**

## Setup
```bash
npm install
cp .env.example .env.local   # isi konfigurasi Firebase (sudah terisi utk project sparks-scheduler)
```

Di **Firebase Console** (project `sparks-scheduler`):
1. **Authentication → Sign-in method →** aktifkan **Email/Password**.
2. **Authentication → Users →** tambahkan akun staf (email + password).
3. **Firestore Database →** buat database (mode production).
4. Deploy rules: `npx firebase deploy --only firestore:rules`.

## Seed master data
Mengisi programs, **16 teachers** (lengkap dengan jadwal OFF per hari), **11
classrooms**, dan **170 siswa** dari `2026.xlsx`:
```bash
SEED_EMAIL=akun-staf@contoh.com SEED_PASSWORD=passwordnya npm run seed
```
Idempotent (boleh dijalankan ulang). Catatan:
- **Jadwal OFF teacher** diturunkan dari marker `OFF` di sheet "Forming Class New".
  DW & LY (ada di legend, belum ada kolom grid) default semua hari. Koreksi via layar **Teacher**.
- **Siswa**: 150 dari 170 belum punya ID di sumbernya — diisi nanti via layar **Siswa**.
- Data siswa ada di `scripts/students.seed.json`.

## Pengembangan lokal
Pakai live project:
```bash
npm run dev
```
Atau offline penuh dengan emulator (set `VITE_USE_EMULATOR=1` di `.env.local`):
```bash
npm run emulators   # terminal 1 (Auth + Firestore)
npm run dev         # terminal 2
# seed ke emulator:
VITE_USE_EMULATOR=1 SEED_EMAIL=test@test.com SEED_PASSWORD=password npm run seed
```

## Verifikasi
```bash
npm test         # 22 unit test (duration, conflict-guard, slot-guide)
npm run typecheck
npm run build
```

## Deploy
```bash
npm run build
npx firebase deploy            # Hosting + Firestore rules
```

## Sync ke Google Sheets (Apps Script)
Connector dua arah ada di `connector/` (Firestore ↔ Google Sheets via Apps Script,
pakai OAuth token Anda — tanpa service account). Export master+grid ke Sheet, import
siswa balik ke Firestore. Lihat `connector/README.md`.

## Struktur
- `src/shared/` — logika murni: `types`, `duration`, `conflict-guard`, `slot-guide` (+ test)
- `src/lib/` — `firebase` (init), `repo` (CRUD + guard terintegrasi), `format`, `queryKeys`
- `src/auth/` — AuthProvider, LoginPage, RequireAuth
- `src/frontend/grid/` — ScheduleGrid, ClassBlock, OpenClassWizard, ClassDetail, DayGroupTabs
- `src/frontend/master/` — TeacherList, ClassroomList, StudentList
- `scripts/seed.ts` — seed Firestore
- `firestore.rules` — keamanan (hanya user login; validasi bentuk dokumen kelas)
