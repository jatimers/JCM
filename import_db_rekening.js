/**
 * import_db_rekening.js — Import CSV ke tabel db_rekening di Supabase
 *
 * Membaca file CSV, mapping kolom, lalu insert ke tabel db_rekening.
 *
 * Usage:
 *   node import_db_rekening.js <file.csv>              # CSV dengan header
 *   node import_db_rekening.js <file.csv> --no-header  # CSV tanpa header
 *
 * Format CSV (dengan header):
 *   NO_REK, NAMA_REK, CIF, KODE_CABANG_REK, TIPE_REK, TGL_BUKA_REK, KODE_EXT, KODE_FO
 *
 * Format CSV (tanpa header — gunakan --no-header):
 *   Urutan kolom: no_rek, nama_rek, cif, kode_cabang_rek, tipe_rek, tgl_buka_rek, kode_ext, kode_fo
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// ============================================================
// CONFIG
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = 'db_rekening';

// Map nama kolom CSV → kolom database
const COLUMN_MAP = {
    'no_rek': 'no_rek',
    'nama_rek': 'nama_rek',
    'cif': 'cif',
    'kode_cabang_rek': 'kode_cabang_rek',
    'tipe_rek': 'tipe_rek',
    'tgl_buka_rek': 'tgl_buka_rek',
    'kode_ext': 'kode_ext',
    'kode_fo': 'kode_fo'
};

// ============================================================
// LOGGING
// ============================================================
function log(msg) {
    const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    console.log(`[${ts}] ${msg}`);
}

// ============================================================
// HELPERS
// ============================================================
function normalizeHeader(h) {
    return h.toString().trim().toLowerCase().replace(/^﻿/, '').replace(/ /g, '_').replace(/\r/g, '');
}

function parseDate(val) {
    // Tangani berbagai format tanggal
    const s = String(val).trim();
    if (!s) return null;

    // YYYYMMDD (misal: 20130724)
    if (/^\d{8}$/.test(s)) {
        return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
    }

    // DD/MM/YYYY atau DD-MM-YYYY
    const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dm) return `${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;

    // YYYY-MM-DD (sudah bagus)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // MM/DD/YYYY
    const md = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (md) return `${md[3]}-${md[1].padStart(2,'0')}-${md[2].padStart(2,'0')}`;

    return s; // return apa adanya
}

// ============================================================
// MAIN
// ============================================================
async function main() {
    log('=== IMPORT DB REKENING START ===');

    // 1. Validasi
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        log('ERROR: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env');
        process.exit(1);
    }

    const csvFile = process.argv[2];
    const noHeader = process.argv.includes('--no-header');
    if (!csvFile) {
        log('ERROR: Harap sertakan nama file CSV.');
        log('Usage: node import_db_rekening.js <file.csv> [--no-header]');
        process.exit(1);
    }

    const filePath = path.isAbsolute(csvFile) ? csvFile : path.join(__dirname, csvFile);
    if (!fs.existsSync(filePath)) {
        log(`ERROR: File "${filePath}" tidak ditemukan.`);
        process.exit(1);
    }

    // 2. Baca CSV
    log(`Membaca file: ${path.basename(filePath)}`);
    const content = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, '');
    const lines = content.split(/\r?\n/).filter(l => l.trim());

    const minLines = noHeader ? 1 : 2;
    if (lines.length < minLines) {
        log('ERROR: CSV kosong' + (noHeader ? '.' : ' atau hanya ada header.'));
        process.exit(1);
    }

    // 3. Parse header
    let colIndex = {};
    let startLine = 1;

    if (noHeader) {
        // Tanpa header — gunakan urutan kolom default
        const DEFAULT_COLUMNS = ['no_rek', 'nama_rek', 'cif', 'kode_cabang_rek', 'tipe_rek', 'tgl_buka_rek', 'kode_ext', 'kode_fo'];
        DEFAULT_COLUMNS.forEach((col, i) => { colIndex[col] = i; });
        startLine = 0;
        log('Mode: --no-header (kolom default)');
    } else {
        const rawHeaders = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
        const headers = rawHeaders.map(normalizeHeader);
        log(`Header CSV: ${headers.join(', ')}`);

        for (let i = 0; i < headers.length; i++) {
            const h = headers[i];
            if (COLUMN_MAP[h]) colIndex[COLUMN_MAP[h]] = i;
        }

        if (colIndex['no_rek'] === undefined) {
            log('ERROR: Kolom "no_rek" / "NO_REK" tidak ditemukan di header CSV.');
            log('Jika CSV tidak memiliki header, gunakan: node import_db_rekening.js <file.csv> --no-header');
            process.exit(1);
        }
    }
    log(`Kolom terpetakan: ${Object.keys(colIndex).join(', ')}`);

    // 4. Parse data rows
    const rows = [];
    for (let i = startLine; i < lines.length; i++) {
        // CSV split sederhana (handle quoted fields)
        const cols = [];
        let current = '';
        let inQuote = false;
        for (const ch of lines[i]) {
            if (ch === '"') { inQuote = !inQuote; continue; }
            if (ch === ',' && !inQuote) { cols.push(current.replace(/^"|"$/g, '').trim()); current = ''; continue; }
            current += ch;
        }
        cols.push(current.replace(/^"|"$/g, '').trim());

        const obj = {};
        for (const [col, idx] of Object.entries(colIndex)) {
            let val = (cols[idx] || '').trim();
            // Konversi tgl_buka_rek ke format DATE
            if (col === 'tgl_buka_rek' && val) val = parseDate(val);
            obj[col] = val;
        }
        if (obj['no_rek']) rows.push(obj);
    }

    log(`Data valid: ${rows.length} baris (dari ${lines.length - 1} baris CSV)`);
    if (rows.length === 0) {
        log('ERROR: Tidak ada data valid.');
        process.exit(1);
    }

    // 5. Insert ke Supabase
    log('Menyimpan ke Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Insert batch (max 1000 per request)
    let inserted = 0;
    const batchSize = 1000;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase.from(TABLE).insert(batch);
        if (error) {
            log(`ERROR batch ${Math.floor(i/batchSize)+1}: ${error.message}`);
            log(`  Detail: ${JSON.stringify(error)}`);
            process.exit(1);
        }
        inserted += batch.length;
        log(`  Batch ${Math.floor(i/batchSize)+1}: ${batch.length} baris OK`);
    }

    // 6. Verifikasi
    const { count, error: countErr } = await supabase
        .from(TABLE)
        .select('*', { count: 'exact', head: true });

    log(`--- Ringkasan ---`);
    log(`  File    : ${path.basename(filePath)}`);
    log(`  Insert  : ${inserted} baris`);
    log(`  Total DB: ${countErr ? '?' : count} baris`);
    log('=== IMPORT DB REKENING END (SUCCESS) ===');
}

main().catch(err => {
    log(`FATAL ERROR: ${err.message}`);
    console.error(err);
    process.exit(1);
});
