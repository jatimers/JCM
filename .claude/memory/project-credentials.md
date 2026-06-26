---
name: project-credentials
description: Lokasi semua credential JConnect Monitor (Supabase, GitHub) di file .env
metadata:
  type: reference
---

Semua credential project JConnect Monitor tersimpan di file `.env` (tidak di-commit ke git — sudah di `.gitignore`):

| Variable | Deskripsi |
|---|---|
| `SUPABASE_URL` | `https://nnjmrwpdqxcxbqbrfytx.supabase.co` |
| `SUPABASE_ANON_KEY` | Anon key untuk frontend (aman expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key untuk backend/admin (RAHASIA) |
| `SUPABASE_PAT` | Personal Access Token untuk Management API (RAHASIA) |

**GitHub**: remote `https://github.com/jatimers/JCM.git` — branch `main`

**Cara pakai**: Load `.env` dengan `dotenv` atau baca langsung. PAT digunakan untuk akses Supabase Management API (query SQL, manage project).

[[git-workflow-after-changes]]
