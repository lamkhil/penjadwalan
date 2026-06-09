# Connector: Google Sheets ↔ Firestore (Apps Script)

Menyambungkan Google Sheet dengan database app (`sparks-scheduler`):
- **Export** — tarik teachers/classrooms/students/classes dari Firestore ke tab Sheet,
  plus tab **Grid <hari>** (teacher × jam, mirip `penjadwalan.png`).
- **Import siswa** — dorong tab `Students` kembali ke Firestore (aman, tanpa guard).

> Pembuatan/ubah **kelas** tetap lewat aplikasi web supaya conflict guard jalan.
> Connector ini hanya mengekspor kelas (read-only untuk classes).

## Cara pakai Firestore tanpa service account
Script memakai **OAuth token Anda sendiri** (`ScriptApp.getOAuthToken`) dengan scope
`datastore`. Karena Anda Owner project `sparks-scheduler`, tidak perlu kunci apa pun.

## Setup (manual, ±5 menit)
1. Buat / buka Google Sheet yang mau dipakai (boyongan dari `2026.xlsx` juga boleh).
2. **Extensions → Apps Script**.
3. **WAJIB:** kaitkan script ke GCP project Firebase, kalau tidak Firestore API dianggap
   belum aktif:
   - ⚙ **Project Settings → Google Cloud Platform (GCP) Project → Change project**
   - Masukkan **project number `343861686324`** (project `sparks-scheduler`) → Set Project.
4. Di editor, buat file sesuai isi folder ini dan **copy-paste**:
   - `Code.gs`, `Firestore.gs`, `Sheets.gs`
   - Aktifkan manifest: ⚙ Project Settings → centang **"Show appsscript.json"**, lalu
     samakan isi `appsscript.json` (terutama `oauthScopes`).
5. Pilih fungsi **`testConnection`** → **Run** → setujui izin (OAuth consent pertama kali).
   Muncul toast "Terhubung. N teacher terbaca".
6. Reload Sheet → muncul menu **"Sparks Sync"**. Pakai:
   - **⬇ Export dari app** → mengisi tab Teachers/Classrooms/Students/Classes + Grid.
   - **⬆ Import siswa** → menulis tab `Students` ke Firestore.

### Opsional: spreadsheet terpisah
Kalau script standalone (bukan bound ke satu Sheet), set Script Property
`SPREADSHEET_ID` = id spreadsheet target. Kalau kosong, dipakai spreadsheet aktif.

## Deploy via clasp (alternatif CLI)
```bash
npm i -g @google/clasp
clasp login
# buat project baru yang ke-bind ke sheet, atau clone yang ada:
cd connector
clasp create --type sheets --title "Sparks Sync"   # atau: clasp clone <scriptId>
clasp push
```
Lalu tetap lakukan langkah **#3 (set GCP project)** di editor, sekali.

## Catatan
- Scope `datastore` + `spreadsheets` + `script.external_request` dideklarasikan di
  `appsscript.json`. Kalau menambah fungsi, pastikan scope cukup.
- Grid menampilkan kolom `OFF` untuk teacher yang tidak mengajar di hari itu, dan
  memposisikan blok kelas pada baris jam mulainya (dibulatkan ke kelipatan 30 menit).
- Kontrak tipe data ada di `../src/shared/sync-contract.ts`.
