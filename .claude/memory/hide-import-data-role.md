---
name: hide-import-data-role
description: Tombol Import Data di tab Rekening Baru hanya muncul untuk admin dan fasilitator
metadata:
  type: project
---

Tombol **"Import Excel"** dan **"Download Template"** di menu **Input Aktivasi → tab Rekening Baru** (`renderInputAktivasi`, line ~865 `index.html`) sekarang dikondisikan dengan pengecekan role:

```javascript
${(currentUser.role === 'admin' || currentUser.role === 'fasilitator') ? `
  <!-- tombol import & template -->` : ''}
```

Role `user` dan `supervisor` tidak akan melihat tombol import tersebut. Menu **Upload Data Nasabah** sudah dari awal terbatas untuk admin & fasilitator saja via konfigurasi `menus` object.

**Why:** User minta fitur import data di tab rekening baru hanya dimunculkan untuk role admin dan fasilitator, role lain di-hide.
**How to apply:** Jika ada penambahan role baru yang perlu akses import, tambahkan di kondisi `currentUser.role === 'admin' || currentUser.role === 'fasilitator'`.
