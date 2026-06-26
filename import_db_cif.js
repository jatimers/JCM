/**
 * import_db_cif.js — Import Excel/CSV ke tabel db_cif di Supabase
 *
 * Usage:
 *   node import_db_cif.js <file.xlsx>            # Excel (auto-detect)
 *   node import_db_cif.js <file.csv>              # CSV dengan header
 *   node import_db_cif.js <file.csv> --no-header  # CSV tanpa header
 *
 * Kolom: kode_cabang_cif, cif, nama_cif, alamat, no_hp, pekerjaan, instansi, detail_instansi, usia
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// ============================================================
// CONFIG
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = 'db_cif';

const COLUMNS = ['kode_cabang_cif', 'cif', 'nama_cif', 'alamat', 'no_hp', 'pekerjaan', 'instansi', 'detail_instansi', 'usia'];

// ============================================================
// LOGGING
// ============================================================
function log(msg) {
    const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    console.log(`[${ts}] ${msg}`);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
    log('=== IMPORT DB CIF START ===');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        log('ERROR: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env');
        process.exit(1);
    }

    const dataFile = process.argv[2];
    const noHeader = process.argv.includes('--no-header');
    if (!dataFile) {
        log('ERROR: Harap sertakan nama file.');
        log('Usage: node import_db_cif.js <file.xlsx|file.csv> [--no-header]');
        process.exit(1);
    }

    const filePath = path.isAbsolute(dataFile) ? dataFile : path.join(__dirname, dataFile);
    if (!fs.existsSync(filePath)) {
        log(`ERROR: File "${filePath}" tidak ditemukan.`);
        process.exit(1);
    }

    const ext = path.extname(filePath).toLowerCase();
    const isExcel = ext === '.xlsx' || ext === '.xls';

    // ============================================================
    // PARSE
    // ============================================================
    let rows = [];

    if (isExcel) {
        // --- Excel ---
        log(`Mode: Excel (${path.basename(filePath)})`);
        const wb = XLSX.readFile(filePath);
        const sheet = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: '', raw: true });
        log(`Sheet: ${sheet} | ${data.length} baris (termasuk header)`);

        if (data.length === 0) {
            log('ERROR: Excel kosong.');
            process.exit(1);
        }

        // Map header → column (case-insensitive, spasi-underscore)
        const firstRow = data[0];
        const headerMap = {};
        for (const [key, val] of Object.entries(firstRow)) {
            const norm = String(key).trim().toLowerCase().replace(/\s+/g, '_');
            headerMap[norm] = key;
        }

        // Cek kolom cif
        if (!headerMap['cif']) {
            log('ERROR: Kolom "cif" tidak ditemukan di header Excel.');
            log(`Header ditemukan: ${Object.keys(headerMap).join(', ')}`);
            process.exit(1);
        }

        // Parse data
        for (const row of data) {
            const obj = {};
            for (const col of COLUMNS) {
                const excelKey = headerMap[col];
                let val = excelKey && row[excelKey] !== undefined ? row[excelKey] : '';
                // Konversi number ke string untuk field text
                if (col === 'cif' || col === 'kode_cabang_cif' || col === 'no_hp') {
                    val = String(val).trim();
                }
                if (col === 'usia') {
                    val = val === '' || val === null || val === undefined ? null : parseInt(val, 10);
                    if (isNaN(val)) val = null;
                }
                if (col === 'alamat') {
                    val = String(val).trim();
                }
                if (val === '' || val === null || val === undefined) val = (col === 'usia') ? null : '';
                obj[col] = val;
            }
            if (obj['cif']) rows.push(obj);
        }

    } else {
        // --- CSV ---
        log(`Mode: CSV (${path.basename(filePath)})`);
        const content = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, '');
        const lines = content.split(/\r?\n/).filter(l => l.trim());

        const minLines = noHeader ? 1 : 2;
        if (lines.length < minLines) {
            log('ERROR: CSV kosong.');
            process.exit(1);
        }

        let colIndex = {};
        let startLine = 1;

        if (noHeader) {
            COLUMNS.forEach((col, i) => { colIndex[col] = i; });
            startLine = 0;
            log('Mode: --no-header (kolom default)');
        } else {
            const rawHeaders = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
            const headers = rawHeaders.map(h => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
            log(`Header CSV: ${headers.join(', ')}`);

            for (let i = 0; i < headers.length; i++) {
                if (COLUMNS.includes(headers[i])) colIndex[headers[i]] = i;
            }
            if (colIndex['cif'] === undefined) {
                log('ERROR: Kolom "cif" tidak ditemukan di header CSV.');
                log('Jika CSV tanpa header, gunakan: node import_db_cif.js <file.csv> --no-header');
                process.exit(1);
            }
        }

        log(`Kolom terpetakan: ${Object.keys(colIndex).join(', ')}`);

        for (let i = startLine; i < lines.length; i++) {
            const cols = [];
            let current = '', inQuote = false;
            for (const ch of lines[i]) {
                if (ch === '"') { inQuote = !inQuote; continue; }
                if (ch === ',' && !inQuote) { cols.push(current.replace(/^"|"$/g, '').trim()); current = ''; continue; }
                current += ch;
            }
            cols.push(current.replace(/^"|"$/g, '').trim());

            const obj = {};
            for (const col of COLUMNS) {
                const idx = colIndex[col];
                let val = idx !== undefined ? (cols[idx] || '').trim() : '';
                if (col === 'usia') val = val === '' ? null : parseInt(val, 10);
                if (val === '' || val === null || val === undefined) val = (col === 'usia') ? null : '';
                obj[col] = val;
            }
            if (obj['cif']) rows.push(obj);
        }
    }

    log(`Data valid untuk di-insert: ${rows.length} baris`);
    if (rows.length === 0) {
        log('ERROR: Tidak ada data valid.');
        process.exit(1);
    }

    // ============================================================
    // INSERT KE SUPABASE
    // ============================================================
    log('Menyimpan ke Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    let inserted = 0;
    const batchSize = 1000;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase.from(TABLE).insert(batch);
        if (error) {
            log(`ERROR batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
            process.exit(1);
        }
        inserted += batch.length;
        log(`  Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} baris OK`);
    }

    // Verifikasi
    const { count, error: countErr } = await supabase
        .from(TABLE)
        .select('*', { count: 'exact', head: true });

    log(`--- Ringkasan ---`);
    log(`  File    : ${path.basename(filePath)}`);
    log(`  Insert  : ${inserted} baris`);
    log(`  Total DB: ${countErr ? '?' : count} baris`);
    log('=== IMPORT DB CIF END (SUCCESS) ===');
}

main().catch(err => {
    log(`FATAL ERROR: ${err.message}`);
    console.error(err);
    process.exit(1);
});
