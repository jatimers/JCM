---
name: project-setup-daily-automation
description: "JConnect Monitor: .dtf update, rtopcb, Supabase upload, Task Scheduler, GitHub Pages deploy"
metadata:
  type: project
---

## JConnect Monitor — Proyek Otomasi Harian

Project di `D:\Project\JCM` — aplikasi monitoring aktivasi JConnect dengan Supabase backend + GitHub Pages frontend.

### File Penting

| File | Fungsi |
|---|---|
| `BukaRekToday.dtf` | Template query transfer data IBM i (AS/400) — di-update tanggal otomatis |
| `rtopcb.exe` | IBM i Client Data Transfer — membaca .dtf dan menghasilkan Excel |
| `run_daily.ps1` | Script otomasi: (1) update tanggal .dtf, (2) jalankan rtopcb, (3) autoupload.js |
| `autoupload.js` | Upload Excel ke Supabase tabel `data_aktivasi` + notifikasi WA Fonnte |
| `.env` | SUPABASE_URL + SUPABASE_ANON_KEY (tidak di-commit) |
| `index.html` | Frontend JConnect Monitor v2.0 — SPA, Tailwind, Supabase JS client |
| `supabase_setup.sql` | SQL schema + RLS + seed data |
| `setup_scheduler.ps1` | Setup Windows Task Scheduler |
| `.github/workflows/deploy.yml` | Auto-deploy ke GitHub Pages via Actions |

### Task Scheduler
- Nama: `JConnect Daily Upload`
- Jadwal: Senin-Jumat jam 15:30 WIB
- Aksi: `powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\Project\JCM\run_daily.ps1"`

### Supabase
- URL: `https://nnjmrwpdqxcxbqbrfytx.supabase.co`
- Tabel: `users`, `data_aktivasi`, `data_migrasi`, `produk`, `settings`

### GitHub
- Repo: `https://github.com/jatimers/JCM`
- Branch: `main`
- Deploy: GitHub Pages via Actions

[[git-workflow-after-changes]] [[project-credentials]]
