-- ============================================================
-- SEQUENCE FIX + AUTO UPLOAD SUPPORT
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Perbaiki sequence agar tidak duplicate key
SELECT setval('public.data_aktivasi_id_seq',
    (SELECT COALESCE(MAX(id), 0) FROM public.data_aktivasi));

SELECT setval('public.data_migrasi_id_seq',
    (SELECT COALESCE(MAX(id), 0) FROM public.data_migrasi));

-- 2. Buat RPC function untuk sinkronisasi sequence (dipanggil auto_upload.js)
CREATE OR REPLACE FUNCTION public.sync_aktivasi_seq()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM setval('public.data_aktivasi_id_seq',
        (SELECT COALESCE(MAX(id), 0) FROM public.data_aktivasi));
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_migrasi_seq()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM setval('public.data_migrasi_id_seq',
        (SELECT COALESCE(MAX(id), 0) FROM public.data_migrasi));
END;
$$;

-- Verifikasi
SELECT
    'data_aktivasi' AS tabel,
    currval('public.data_aktivasi_id_seq') AS current_seq_val,
    (SELECT COALESCE(MAX(id), 0) FROM public.data_aktivasi) AS max_id
UNION ALL
SELECT
    'data_migrasi',
    currval('public.data_migrasi_id_seq'),
    (SELECT COALESCE(MAX(id), 0) FROM public.data_migrasi);
