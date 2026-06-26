---
name: git-workflow-after-changes
description: After completing and verifying all file changes, always git add, commit, and push to main
metadata:
  type: feedback
---

Setiap kali semua file selesai dibuat/diubah dan sudah diverifikasi, langsung lakukan:

1. `git add .` (atau file spesifik yang diubah)
2. `git commit -m "pesan deskriptif tentang fitur/perubahan yang dilakukan"`
3. `git push origin main`

**Why:** User ingin workflow otomatis — setelah semua perubahan selesai dan dicek, langsung commit dan push tanpa perlu diingatkan lagi. Branch selalu `main`.

**How to apply:** Setelah menyelesaikan semua perubahan kode dan verifikasi, langsung jalankan ketiga perintah git tersebut secara berurutan. Gunakan pesan commit dalam format bahasa Indonesia yang deskriptif (misal: `feat: tambah fitur notifikasi WhatsApp`, `fix: perbaiki bug pagination`).
