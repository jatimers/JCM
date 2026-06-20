# PROMPT MIGRASI: Kas Monitor — Google Apps Script → GitHub + Supabase

Gunakan prompt ini di **Claude Code** pada direktori project Anda.

---

## KONTEKS APLIKASI

Saya memiliki aplikasi **Kas Monitor Operasional** yang saat ini berjalan di:
- **Backend**: Google Apps Script (`Code.gs`) — mengelola data lewat Google Sheets
- **Frontend**: `index.html` — UI single-page app yang dipanggil via `google.script.run`

Saya ingin memigrasi aplikasi ini ke:
- **Frontend hosting**: GitHub Pages (atau Vercel/Netlify jika diperlukan)
- **Backend/Database**: Supabase (PostgreSQL + REST API + Auth)
- **Backend API**: Supabase Edge Functions (Deno) sebagai pengganti `Code.gs`

---

## STRUKTUR DATABASE YANG HARUS DIBUAT DI SUPABASE

Buat SQL migration script untuk tabel-tabel berikut (sesuai sheet Google Sheets asal):

```sql
-- 1. users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  kode_wilayah TEXT,
  kode_cabang TEXT,
  nama_unit TEXT,
  nama_user TEXT,
  role TEXT,
  user_estim TEXT UNIQUE,
  password TEXT
);

-- 2. bon_setor
CREATE TABLE bon_setor (
  id_transaksi TEXT PRIMARY KEY,
  tanggal DATE,
  user_estim TEXT,
  tipe TEXT,
  kategori TEXT,
  pecahan TEXT,
  lembar INTEGER,
  nominal BIGINT,
  kode_cabang TEXT,
  kode_wilayah TEXT,
  scope TEXT
);

-- 3. arsip_bon_setor (struktur sama dengan bon_setor)
CREATE TABLE arsip_bon_setor (LIKE bon_setor INCLUDING ALL);

-- 4. posisi_kas
CREATE TABLE posisi_kas (
  id SERIAL PRIMARY KEY,
  tanggal DATE,
  user_estim TEXT,
  saldo_kemarin BIGINT,
  penerimaan_debet BIGINT,
  penerimaan_antar_teller BIGINT,
  pembayaran_kredit BIGINT,
  pembayaran_antar_teller BIGINT,
  saldo_hari_ini BIGINT,
  saldo_fisik BIGINT,
  selisih BIGINT,
  kode_cabang TEXT,
  kode_wilayah TEXT,
  selisih_pembulatan BIGINT
);

-- 5. saldo_awal_ht
CREATE TABLE saldo_awal_ht (
  id SERIAL PRIMARY KEY,
  tanggal DATE,
  user_estim TEXT,
  kategori TEXT,
  pecahan TEXT,
  lembar INTEGER,
  nominal BIGINT,
  kode_cabang TEXT,
  kode_wilayah TEXT
);

-- 6. data_pegawai
CREATE TABLE data_pegawai (
  id SERIAL PRIMARY KEY,
  user_estim_teller TEXT,
  nip_teller TEXT,
  nama_teller TEXT,
  nip_pimkas TEXT,
  nama_pimkas TEXT,
  user_estim_pimkas TEXT
);

-- 7. data_pejabat_ht
CREATE TABLE data_pejabat_ht (
  id SERIAL PRIMARY KEY,
  kode_wilayah TEXT,
  nip_penyelia TEXT,
  nama_penyelia TEXT,
  nip_pbo TEXT,
  nama_pbo TEXT
);

-- 8. setting_fonnte
CREATE TABLE setting_fonnte (
  id SERIAL PRIMARY KEY,
  kode_wilayah TEXT,
  token TEXT,
  no_hp TEXT,
  waktu TEXT,
  token_kf TEXT,
  target_kf TEXT,
  target_tukab TEXT,
  waktu_perkiraan_h1 TEXT,
  target_perkiraan_h1 TEXT,
  target_posisi_kas TEXT
);

-- 9. perkiraan_bon_setor
CREATE TABLE perkiraan_bon_setor (
  id SERIAL PRIMARY KEY,
  tanggal DATE,
  user_estim TEXT,
  kode_wilayah TEXT,
  p100k_setor BIGINT,
  p100k_bon BIGINT,
  p50k_setor BIGINT,
  p50k_bon BIGINT,
  waktu_input TIMESTAMP
);

-- 10. hari_libur
CREATE TABLE hari_libur (
  id SERIAL PRIMARY KEY,
  tanggal DATE UNIQUE,
  keterangan TEXT
);

-- 11. pesanan_nasabah
CREATE TABLE pesanan_nasabah (
  id TEXT PRIMARY KEY,
  tanggal DATE,
  user_estim TEXT,
  kode_wilayah TEXT,
  nama_nasabah TEXT,
  p100k BIGINT,
  p50k BIGINT,
  waktu_input TIMESTAMP
);
```

Tambahkan **Row Level Security (RLS)** Supabase dan seed data awal untuk tabel `users` (admin default).

---

## TUGAS MIGRASI BACKEND (Code.gs → Supabase Edge Functions)

Baca file `Code.gs` yang ada di project ini. Setiap function di `Code.gs` yang dipanggil via `google.script.run` harus dikonversi menjadi **Supabase Edge Function** (Deno/TypeScript) dengan endpoint REST.

Daftar fungsi utama yang harus dikonversi:

| Function GAS | Endpoint Baru | Method |
|---|---|---|
| `loginUser(user, pass)` | `/api/auth/login` | POST |
| `getBonSetor(params)` | `/api/bon-setor` | GET |
| `saveBonSetor(data)` | `/api/bon-setor` | POST |
| `deleteBonSetor(id)` | `/api/bon-setor/:id` | DELETE |
| `getPosisiKas(params)` | `/api/posisi-kas` | GET |
| `savePosisiKas(data)` | `/api/posisi-kas` | POST |
| `getSaldoAwalHT(params)` | `/api/saldo-awal-ht` | GET |
| `saveSaldoAwalHT(data)` | `/api/saldo-awal-ht` | POST |
| `getDataPegawai(params)` | `/api/pegawai` | GET |
| `saveDataPegawai(data)` | `/api/pegawai` | POST |
| `getListHariLibur()` | `/api/hari-libur` | GET |
| `saveHariLibur(obj)` | `/api/hari-libur` | POST/PUT |
| `deleteHariLibur(tgl)` | `/api/hari-libur/:tgl` | DELETE |
| `getPesananNasabah(params)` | `/api/pesanan-nasabah` | GET |
| `savePesananNasabah(data)` | `/api/pesanan-nasabah` | POST |
| `deletePesananNasabah(id)` | `/api/pesanan-nasabah/:id` | DELETE |
| `getPerkiraan(params)` | `/api/perkiraan` | GET |
| `savePerkiraan(data)` | `/api/perkiraan` | POST |
| `getSettingFonnte(params)` | `/api/setting-fonnte` | GET |
| `saveSettingFonnte(data)` | `/api/setting-fonnte` | POST |
| `getServerNextWorkingDay()` | `/api/next-working-day` | GET |
| `getLaporanHT(params)` | `/api/laporan-ht` | GET |
| `kirimNotifFonnte(params)` | `/api/notif-fonnte` | POST |
| `getUsers(params)` | `/api/users` | GET |
| `saveUser(data)` | `/api/users` | POST |
| `deleteUser(id)` | `/api/users/:id` | DELETE |
| `getPejabatHT(params)` | `/api/pejabat-ht` | GET |
| `savePejabatHT(data)` | `/api/pejabat-ht` | POST |

Pastikan:
- Setiap endpoint melakukan validasi input
- Gunakan Supabase JS client (`@supabase/supabase-js`) untuk query database
- Kembalikan response JSON dengan format konsisten: `{ success: true, data: [...] }` atau `{ success: false, error: "..." }`
- Logika bisnis seperti `getLaporanHT` (running saldo, rekap pecahan) harus dipindahkan ke Edge Function

---

## TUGAS MIGRASI FRONTEND (index.html)

Baca file `index.html` yang ada di project ini. Lakukan perubahan berikut:

### 1. Ganti semua `google.script.run` → `fetch` API

**Pola sebelumnya (GAS):**
```javascript
google.script.run
  .withSuccessHandler(function(result) { ... })
  .withFailureHandler(function(err) { ... })
  .namaFungsi(params);
```

**Pola baru (REST API):**
```javascript
async function callApi(endpoint, method = 'GET', body = null) {
  const res = await fetch(SUPABASE_URL + endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    body: body ? JSON.stringify(body) : null
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}
```

### 2. Ganti sistem autentikasi

- Hapus `google.script.run.loginUser(...)` 
- Ganti dengan call ke `/api/auth/login` dan simpan JWT token di `localStorage`
- Tambahkan fungsi `getToken()` dan `logout()` yang mengelola token

### 3. Tambahkan konfigurasi environment

Di bagian `<head>` atau file `config.js` terpisah, tambahkan:
```javascript
const CONFIG = {
  SUPABASE_URL: 'https://jwsfsczgyqphoyflpjnm.supabase.co',
  // Token disimpan setelah login, bukan hardcode
};
```

### 4. Hapus tag dan atribut khusus Google Apps Script

- Hapus `<base target="_top">` 
- Hapus semua referensi ke `google.script.history` jika ada
- Pastikan semua path resource (CSS, font) menggunakan URL absolut

### 5. Pertahankan semua UI, logic tampilan, dan fitur yang sudah ada

Jangan ubah: struktur HTML, CSS, nama class, navigasi menu, tabel, modal, kalkulasi saldo, dsb. Hanya ganti layer komunikasi data.

---

## STRUKTUR PROJECT YANG DIHARAPKAN

```
kas-monitor/
├── frontend/
│   ├── index.html          # index.html yang sudah dimigrasi
│   ├── config.js           # Konfigurasi URL & helper
│   └── README.md
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql    # SQL schema semua tabel
│   └── functions/
│       ├── auth/
│       │   └── index.ts
│       ├── bon-setor/
│       │   └── index.ts
│       ├── posisi-kas/
│       │   └── index.ts
│       ├── laporan-ht/
│       │   └── index.ts
│       └── ... (satu folder per endpoint)
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions: auto deploy frontend ke GitHub Pages
└── README.md               # Cara setup, variabel env yang dibutuhkan
```

---

## INSTRUKSI TAMBAHAN

1. **Baca dulu** seluruh `Code.gs` dan `index.html` sebelum mulai menulis kode apapun
2. **Jangan skip** fungsi apapun di `Code.gs` — semua harus punya padanannya di Edge Function
3. Untuk logika kompleks seperti `getLaporanHT` (rekap running saldo per pecahan), **terjemahkan logikanya persis** ke TypeScript
4. Gunakan **Deno** untuk Edge Functions (bukan Node.js), sesuai standar Supabase
5. Buat file `README.md` yang menjelaskan:
   - Cara membuat project Supabase baru
   - Cara menjalankan migration SQL
   - Cara deploy Edge Functions
   - Cara mengisi variabel di `config.js`
   - Cara enable GitHub Pages

---

## MULAI DARI SINI

Mulai dengan langkah ini secara berurutan:
1. Baca `Code.gs` dan `index.html`
2. Buat folder struktur project di atas
3. Buat `supabase/migrations/001_init.sql`
4. Buat Edge Function untuk `/api/auth/login` terlebih dahulu sebagai contoh pola
5. Lanjutkan Edge Function lainnya
6. Buat `frontend/index.html` yang sudah dimigrasi
7. Buat `README.md` lengkap
