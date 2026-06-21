/**
 * import_db_aktivasi_asn.js — Import Excel/CSV ke tabel db_aktivasi_asn di Supabase
 *
 * Usage:
 *   node import_db_aktivasi_asn.js <file.xlsx>            # Excel (auto-detect)
 *   node import_db_aktivasi_asn.js <file.csv>              # CSV dengan header
 *   node import_db_aktivasi_asn.js <file.csv> --no-header  # CSV tanpa header
 *
 * Kolom: cif, no_rek_aktivasi, status_aktivasi, ket_aktivasi
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
const TABLE = 'db_aktivasi_asn';
const COLUMNS = ['cif', 'no_rek_aktivasi', 'status_aktivasi', 'ket_aktivasi'];

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
    log('=== IMPORT DB AKTIVASI ASN START ===');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        log('ERROR: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env');
        process.exit(1);
    }

    const dataFile = process.argv[2];
    const noHeader = process.argv.includes('--no-header');
    if (!dataFile) {
        log('ERROR: Harap sertakan nama file.');
        log('Usage: node import_db_aktivasi_asn.js <file.xlsx|file.csv> [--no-header]');
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
        log(`Mode: Excel (${path.basename(filePath)})`);
        const wb = XLSX.readFile(filePath);
        const sheet = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: '', raw: true });
        log(`Sheet: ${sheet} | ${data.length} baris`);

        if (data.length === 0) { log('ERROR: Excel kosong.'); process.exit(1); }

        for (const row of data) {
            const obj = {};
            for (const col of COLUMNS) {
                let val = row[col];
                if (val === undefined || val === null || val === '') val = '';
                else val = String(val).trim();
                obj[col] = val;
            }
            if (obj['cif']) rows.push(obj);
        }
    } else {
        log(`Mode: CSV (${path.basename(filePath)})`);
        const content = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, '');
        const lines = content.split(/\r?\n/).filter(l => l.trim());
        const minLines = noHeader ? 1 : 2;
        if (lines.length < minLines) { log('ERROR: CSV kosong.'); process.exit(1); }

        let colIndex = {}, startLine = 1;
        if (noHeader) {
            COLUMNS.forEach((col, i) => { colIndex[col] = i; });
            startLine = 0;
            log('Mode: --no-header');
        } else {
            const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase().replace(/\s+/g, '_'));
            headers.forEach((h, i) => { if (COLUMNS.includes(h)) colIndex[h] = i; });
            if (colIndex['cif'] === undefined) {
                log('ERROR: Kolom "cif" tidak ditemukan. Gunakan --no-header jika tanpa header.');
                process.exit(1);
            }
        }

        for (let i = startLine; i < lines.length; i++) {
            const cols = []; let current = '', inQuote = false;
            for (const ch of lines[i]) {
                if (ch === '"') { inQuote = !inQuote; continue; }
                if (ch === ',' && !inQuote) { cols.push(current.replace(/^"|"$/g, '').trim()); current = ''; continue; }
                current += ch;
            }
            cols.push(current.replace(/^"|"$/g, '').trim());
            const obj = {};
            for (const col of COLUMNS) {
                const idx = colIndex[col];
                obj[col] = idx !== undefined ? (cols[idx] || '').trim() : '';
                if (!obj[col]) obj[col] = '';
            }
            if (obj['cif']) rows.push(obj);
        }
    }

    log(`Data valid: ${rows.length} baris`);
    if (rows.length === 0) { log('ERROR: Tidak ada data valid.'); process.exit(1); }

    // ============================================================
    // INSERT
    // ============================================================
    log('Menyimpan ke Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    let inserted = 0;
    const batchSize = 1000;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase.from(TABLE).insert(batch);
        if (error) { log(`ERROR: ${error.message}`); process.exit(1); }
        inserted += batch.length;
        log(`  Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} OK`);
    }

    const { count, error: countErr } = await supabase.from(TABLE).select('*', { count: 'exact', head: true });
    log(`--- Ringkasan ---`);
    log(`  File    : ${path.basename(filePath)}`);
    log(`  Insert  : ${inserted} baris`);
    log(`  Total DB: ${countErr ? '?' : count} baris`);
    log('=== IMPORT DB AKTIVASI ASN END (SUCCESS) ===');
}

main().catch(err => { log(`FATAL: ${err.message}`); console.error(err); process.exit(1); });
