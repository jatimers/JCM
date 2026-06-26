---
name: project-overview
description: Complete overview of JConnect Monitor project — architecture, tables, features, and how to continue work
metadata:
  type: project
---

# JConnect Monitor — Project Overview

## Tech Stack
- **Frontend**: Single `index.html` (SPA) — GitHub Pages at `https://jatimers.github.io/JCM/`
- **Backend/Database**: Supabase at `https://nnjmrwpdqxcxbqbrfytx.supabase.co`
- **Auth**: Custom login via `users` table (bukan Supabase Auth)
- **Deploy**: GitHub Actions auto-deploy on push to `main`

## Credentials (semua di `.env` — file tidak di-commit)
- `SUPABASE_URL`: `https://nnjmrwpdqxcxbqbrfytx.supabase.co`
- `SUPABASE_ANON_KEY`: (lihat `.env`)
- `SUPABASE_SERVICE_ROLE_KEY`: (lihat `.env`)
- `SUPABASE_PAT`: (lihat `.env`) — untuk Management API
- **GitHub**: `https://github.com/jatimers/JCM.git` — branch `main`

## Database Tables

| Table | Rows | Key Columns | Notes |
|---|---|---|---|
| `users` | 14 | id, nama_unit, nama_user, role, user_estim, password, kode_cabang, kode_ext | Custom auth |
| `data_aktivasi` | 1,395 | id, date, kode_cabang, cif, no_rek, nama, no_hp, status, kendala, user_estim | Rekening baru |
| `data_migrasi` | ? | same structure | Rekening lama |
| `db_rekening` | 175,316 | no_rek, nama_rek, cif, kode_cabang_rek, tipe_rek, tgl_buka_rek, kode_ext, kode_fo | Master rekening |
| `db_cif` | 1,899 | cif, nama_cif, no_hp, alamat, instansi, pekerjaan, kode_cabang_cif, usia | Master CIF |
| `db_aktivasi_asn` | 1,899 | cif, status_aktivasi, ket_aktivasi, foto_url | Status aktivasi ASN |
| `db_rekening` (in xls) | - | no_rek, nama_rek, cif, kode_cabang_rek, tipe_rek, tgl_buka_rek, kode_ext, kode_fo | Imported from Excel |
| `produk` | ? | kode, nama | Product codes |
| `settings` | ? | key, value | App settings (WA, etc.) |
| `hari_libur` | ? | tanggal, keterangan | Holidays |

## Database Views

### `v_aktivasi_asn`
Uses DISTINCT ON (cif) — 1 row per ASN (1,899 rows). Joins:
```
db_aktivasi_asn.cif → db_cif.cif (nama, hp, instansi, alamat)
db_aktivasi_asn.cif → db_rekening.cif (no_rek, kode_ext)
db_rekening.kode_ext → users.kode_ext (nama_unit)
Fallback: db_rekening.kode_cabang_rek → users.kode_cabang
```

## Application Menus by Role

### Admin
- Dashboard, Upload Data Nasabah, Data Nasabah, **Aktivasi ASN**, Kelola Produk, Kelola User, Laporan Aktivasi, Pengaturan WA

### Fasilitator
- Dashboard, Upload Data Nasabah, Data Nasabah, **Aktivasi ASN**, Kelola Produk, Laporan Aktivasi, Pengaturan WA

### Supervisor
- Dashboard, **Aktivasi ASN**, Laporan Aktivasi

### User
- Dashboard Unit, Input Aktivasi (Rek. Baru / Rek. Lama / **Rek. ASN**), **Aktivasi ASN**, Laporan Unit

## Key Features Implemented

### 1. Aktivasi ASN Menu
- Dashboard cards: Sudah / Belum / Tidak Bisa
- Filter by Instansi & Unit Kerja
- Paginated table (50/baris)
- Click row → detail modal (alamat, no_hp, all norek, foto)
- Admin can edit status & delete photos in modal

### 2. Input Rekening ASN Tab (User only)
- Search by nama/no_rek/instansi from v_aktivasi_asn
- Detail panel: alamat, no_hp, all norek, instansi, unit
- Auto-save status (belum/sudah/tidak)
- Photo upload with client-side compression (1024px, JPEG 65%)
- Storage bucket: `bukti-aktivasi` (public)
- Camera capture + gallery upload

### 3. User Management
- kode_cabang (3 digit) + kode_ext (7 digit) fields
- Table shows both fields, edit modal includes them

### 4. Data Import Scripts
- `autoupload.js` — Excel → data_aktivasi
- `import_db_rekening.js` — CSV/Excel → db_rekening (supports --no-header)
- `import_db_cif.js` — Excel/CSV → db_cif
- `import_db_aktivasi_asn.js` — Excel/CSV → db_aktivasi_asn
- `proses_pisahrek.js` — Split multi-norek Excel rows

### 5. Storage
- Bucket `bukti-aktivasi` (public) — for ASN activation proof photos
- Policies: allow_public_upload_bukti (INSERT), allow_public_read_bukti (SELECT)

## How to Continue Work
1. All credentials in `.env` (gitignored)
2. Run scripts with: `node <script.js> <file>`
3. Frontend changes: edit `index.html` → commit → auto-deploy
4. DB changes: use Supabase Management API with PAT
5. [[git-workflow-after-changes]] — auto commit+push after changes
6. [[project-credentials]] — credential details
