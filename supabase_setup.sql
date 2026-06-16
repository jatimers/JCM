-- ============================================================
-- SETUP DATABASE SUPABASE - JConnect Monitor
-- Jalankan script ini di Supabase > SQL Editor
-- ============================================================

-- 1. TABEL USERS
CREATE TABLE IF NOT EXISTS public.users (
    id          TEXT PRIMARY KEY,
    nama_unit   TEXT NOT NULL,
    nama_user   TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'user',   -- admin | supervisor | fasilitator | user
    user_estim  TEXT DEFAULT '',
    password    TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL DATA AKTIVASI (Rekening Baru)
CREATE TABLE IF NOT EXISTS public.data_aktivasi (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    kode_cabang     TEXT DEFAULT '',
    cif             TEXT DEFAULT '',
    no_rek          TEXT NOT NULL,
    tipe_produk     TEXT DEFAULT '',
    nama            TEXT DEFAULT '',
    no_hp           TEXT DEFAULT '',
    user_estim      TEXT DEFAULT '',
    status          TEXT DEFAULT 'Belum',   -- Belum | Sudah | Tidak
    kendala         TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL DATA MIGRASI (Rekening Lama / Existing)
CREATE TABLE IF NOT EXISTS public.data_migrasi (
    id                  BIGSERIAL PRIMARY KEY,
    date                DATE NOT NULL,
    kode_cabang         TEXT DEFAULT '',
    cif                 TEXT DEFAULT '',
    no_rek              TEXT NOT NULL,
    tipe_produk         TEXT DEFAULT '',
    nama                TEXT DEFAULT '',
    no_hp               TEXT DEFAULT '',
    user_estim          TEXT DEFAULT '',
    nama_fasilitator    TEXT DEFAULT '',
    status              TEXT DEFAULT 'Sudah', -- Belum | Sudah | Tidak
    kendala             TEXT DEFAULT '',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL PRODUK
CREATE TABLE IF NOT EXISTS public.produk (
    kode_produk     TEXT PRIMARY KEY,
    nama_produk     TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL SETTINGS (Key-Value)
CREATE TABLE IF NOT EXISTS public.settings (
    key         TEXT PRIMARY KEY,
    value       TEXT DEFAULT '',
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DATA AWAL (SEED)
-- ============================================================

-- Users default
INSERT INTO public.users (id, nama_unit, nama_user, role, user_estim, password)
VALUES
    ('ADMIN',  'Kantor Pusat',    'Administrator Utama', 'admin', '',                           'admin'),
    ('009',    'Cabang Lumajang', 'Eko Budianto',        'user',  'JTM009SP01, JTM009SP03',     'CabangLumajang1!')
ON CONFLICT (id) DO NOTHING;

-- Produk default
INSERT INTO public.produk (kode_produk, nama_produk)
VALUES
    ('T01', 'Simpeda'),
    ('T02', 'Siklus'),
    ('T11', 'Tabunganku')
ON CONFLICT (kode_produk) DO NOTHING;

-- Settings default
INSERT INTO public.settings (key, value)
VALUES
    ('WA_TOKEN',  ''),
    ('WA_TARGET', ''),
    ('WA_STATUS', 'OFF'),
    ('GSHEET_URL', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTEJ2Tb2Dh6LHrDnno3JtFj62TfLFjr38TZwpAtdU8rmHEK6jpAWmXq5FSyWfvcLxV-xF2w7AM1EPXn/pub?output=csv')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Aktifkan RLS agar hanya request dengan anon key yang valid
-- dapat mengakses data (via Supabase client)
-- ============================================================

ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_aktivasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_migrasi  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produk        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings      ENABLE ROW LEVEL SECURITY;

-- Policy: izinkan semua operasi menggunakan anon key
-- (Autentikasi dikelola di sisi aplikasi dengan validasi password manual)
-- Catatan: Untuk produksi, pertimbangkan menggunakan Supabase Auth

CREATE POLICY "Allow all for anon" ON public.users
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public.data_aktivasi
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public.data_migrasi
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public.produk
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public.settings
    FOR ALL TO anon USING (true) WITH CHECK (true);
