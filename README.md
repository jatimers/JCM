# JConnect Monitor

Aplikasi monitoring aktivasi **JConnect** — Bank Jatim. Single-page web app dengan backend **Supabase** (PostgreSQL) dan otomasi harian via **Windows Task Scheduler**.

## 🏗 Arsitektur

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  IBM i (AS/400) │ →  │  rtopcb.exe       │ →  │  Excel (.xls) │
│  (REDTBG table) │     │  (Client Transfer) │     │  BukaRek-*.xls│
└──────────────┘     └──────────────────┘     └──────────────┘
                                                       │
                                               autoupload.js
                                                       │
                                                       ▼
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Browser UI   │ ←→  │  Supabase         │ ←   │  PostgreSQL  │
│  (index.html) │     │  (REST API)       │     │  Database    │
└──────────────┘     └──────────────────┘     └─────────────┘
```

## 📁 Struktur Project

| File | Deskripsi |
|---|---|
| `index.html` | Frontend utama — SPA monitoring aktivasi JConnect |
| `autoupload.js` | Script Node.js untuk upload Excel → Supabase |
| `run_daily.ps1` | PowerShell script otomasi harian (update .dtf → rtopcb → upload) |
| `proses_pisahrek.js` | Script Node.js untuk memisah rekening dari Excel |
| `supabase_setup.sql` | SQL schema untuk setup database Supabase |
| `migration_sequence_fix.sql` | Fix sequence ID setelah bulk insert |
| `setup_scheduler.ps1` | Setup Windows Task Scheduler untuk otomasi |
| `.github/workflows/deploy.yml` | GitHub Actions untuk auto-deploy ke GitHub Pages |

## 🚀 Setup Project Baru

### 1. Prasyarat
- **Node.js** v18+
- **Git**
- Akun **Supabase** (free tier cukup)
- Windows 10+ dengan **PowerShell 5.1**

### 2. Clone & Install
```powershell
git clone https://github.com/jatimers/JCM.git
cd JCM
npm install
```

### 3. Setup Supabase
1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor** → jalankan isi `supabase_setup.sql`
3. Copy **URL** dan **anon key** dari Settings → API
4. Buat file `.env`:
```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

### 4. Konfigurasi Frontend
Edit bagian konfigurasi di `index.html`:
```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJI...';
```

### 5. Setup Task Scheduler (Opsional)
```powershell
.\setup_scheduler.ps1
```
Atau buat manual:
- Nama: `JConnect Daily Upload`
- Trigger: Senin-Jumat, 15:30 WIB
- Action: `powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\Project\JCM\run_daily.ps1"`

### 6. Enable GitHub Pages
1. Settings → Pages → Source: **GitHub Actions**
2. Push ke branch `main` — auto deploy via Actions

## ⚙️ Cara Kerja Otomasi Harian

1. **Task Scheduler** trigger `run_daily.ps1` jam 15:30 WIB
2. Script update tanggal di `BukaRekToday.dtf` (IBM i query template)
3. `rtopcb.exe` baca .dtf → transfer data dari IBM i → generate `BukaRek-DDMMYYYY.xls`
4. `autoupload.js` baca Excel → mapping kolom → insert ke Supabase `data_aktivasi`
5. Kirim notifikasi WhatsApp via **Fonnte API** (jika diaktifkan)

## 🧪 Test Manual
```powershell
# Test full pipeline
.\run_daily.ps1

# Test dengan tanggal spesifik
.\run_daily.ps1 -Date "2026-06-22"

# Test upload manual
node autoupload.js "file.xls" "2026-06-21"

# Test pisah rekening
node proses_pisahrek.js
```

## 📊 Database

### Tabel Utama
| Tabel | Keterangan |
|---|---|
| `users` | User & auth (admin, supervisor, fasilitator) |
| `data_aktivasi` | Data rekening BARU yang akan diaktivasi |
| `data_migrasi` | Data rekening LAMA (existing) |
| `produk` | Kode produk (Simpeda, Siklus, Tabunganku) |
| `settings` | Key-value settings (WA token, notifikasi) |

### Auth
Manual authentication via tabel `users`. Bukan Supabase Auth. Password divalidasi di sisi frontend.

## 🔐 Keamanan

- `.env` TIDAK PERNAH di-commit ke Git (ada di `.gitignore`)
- File Excel (.xls/.xlsx) dan CSV data nasabah TIDAK PERNAH di-commit
- RLS Supabase di-set `ALLOW ALL for anon` — cocok untuk aplikasi internal
- Untuk deployment publik, aktifkan Supabase Auth atau batasi RLS

## 📝 Lisensi

Internal — Bank Jatim
