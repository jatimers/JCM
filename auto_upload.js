/**
 * auto_upload.js — Auto Upload Data Nasabah (Rekening Baru)
 *
 * Membaca file Excel BukaRek-ddmmyyyy.xlsx dari folder D:\Project\JCM,
 * lalu insert ke tabel data_aktivasi di Supabase.
 *
 * Dijalankan oleh Windows Task Scheduler setiap hari jam 15:30.
 *
 * Usage: node auto_upload.js
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
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY; // atau SERVICE_ROLE_KEY
const BASE_DIR = __dirname;                          // D:\Project\JCM
const TABLE = 'data_aktivasi';

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
    log('=== AUTO UPLOAD NASABAH START ===');

    // 1. Validasi env
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        log('ERROR: SUPABASE_URL atau SUPABASE_KEY tidak ditemukan di .env');
        process.exit(1);
    }

    // 2. Tentukan file Excel
    //    - Jika ada argument CLI, pakai itu (untuk test manual)
    //    - Jika tidak, cari BukaRek-ddmmyyyy.xlsx berdasarkan tanggal hari ini
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const dateStr = `${dd}${mm}${yyyy}`;

    let dateISO = `${yyyy}-${mm}-${dd}`;
    let fileName, filePath;

    const cliFile = process.argv[2]; // argument pertama: nama file
    if (cliFile) {
        fileName = cliFile;
        filePath = path.isAbsolute(cliFile) ? cliFile : path.join(BASE_DIR, cliFile);
        // Jika user tidak kasih tanggal lewat arg kedua, pakai hari ini
        if (process.argv[3]) dateISO = process.argv[3];
        log(`Mode manual: memproses file "${fileName}" dengan tanggal ${dateISO}`);
    } else {
        // Auto mode: coba beberapa pola nama file (ddmmyy / ddmmyyyy, .xls / .xlsx)
        const dateShort = `${dd}${mm}${String(yyyy).slice(-2)}`;
        const patterns = [
            `BukaRek-${dateShort}.xls`,
            `BukaRek-${dateShort}.xlsx`,
            `BukaRek-${dateStr}.xls`,
            `BukaRek-${dateStr}.xlsx`
        ];
        let found = null;
        for (const p of patterns) {
            const fp = path.join(BASE_DIR, p);
            if (fs.existsSync(fp)) { found = fp; fileName = p; break; }
        }
        if (!found) {
            log(`ERROR: Tidak ditemukan file dengan pola BukaRek-${dateShort}.* atau BukaRek-${dateStr}.*`);
            log(`Pola yang dicoba: ${patterns.join(', ')}`);
            log('=== AUTO UPLOAD NASABAH END (FILE NOT FOUND) ===');
            process.exit(0);
        }
        filePath = found;
    }

    log(`Mencari file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        log(`ERROR: File "${fileName}" tidak ditemukan.`);
        if (!cliFile) {
            log('Tips: gunakan "node auto_upload.js <namafile>" untuk test manual.');
        }
        log('=== AUTO UPLOAD NASABAH END (FILE NOT FOUND) ===');
        process.exit(0);
    }

    // 3. Baca Excel
    log(`Membaca file Excel: ${fileName}`);
    let workbook;
    try {
        workbook = XLSX.readFile(filePath);
    } catch (err) {
        log(`ERROR: Gagal membaca file Excel: ${err.message}`);
        process.exit(1);
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        log('ERROR: Tidak ada sheet di file Excel.');
        process.exit(1);
    }

    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    log(`Jumlah baris terbaca (termasuk header): ${jsonData.length}`);

    // 4. Mapping data (sama persis dengan handleFileUpload di index.html)
    let mappedData = [];
    for (let row of jsonData) {
        let getVal = (possibleKeys) => {
            let key = Object.keys(row).find(k => possibleKeys.includes(k.toLowerCase().trim()));
            return key ? row[key].toString().trim() : '';
        };

        let cab = getVal(['kodecabang', 'kode cabang', 'kode_cabang']);
        let cleanRek = getVal(['norek', 'no_rekening', 'no rekening']);

        if (cleanRek !== '') {
            let obj = {
                date: dateISO,
                kode_cabang: cab,
                cif: getVal(['cif']),
                no_rek: cleanRek,
                tipe_produk: getVal(['tipeproduk', 'tipe_produk', 'tipe produk']),
                nama: getVal(['nama', 'nama_rekening', 'nama rekening']),
                no_hp: getVal(['nohp', 'no hp', 'no_hp']),
                user_estim: getVal(['userinput', 'user_input', 'user_estim', 'user estim']),
                status: 'Belum',
                kendala: ''
            };
            mappedData.push(obj);
        }
    }

    if (mappedData.length === 0) {
        log('ERROR: Tidak ada data valid di file Excel (kolom no_rekening kosong semua).');
        log('=== AUTO UPLOAD NASABAH END (NO DATA) ===');
        process.exit(0);
    }

    log(`Data valid untuk di-insert: ${mappedData.length} baris`);

    // 5. Koneksi Supabase & insert
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 5a. Pastikan sequence tidak out-of-sync (fix duplicate key)
    log('Memeriksa & sinkronisasi sequence ID...');
    try {
        const { error: seqErr } = await supabase.rpc('sync_aktivasi_seq');
        if (seqErr) {
            // Kalau RPC belum ada, jalankan raw SQL via REST
            log('  RPC sync_aktivasi_seq belum tersedia, coba jalankan via SQL...');
            // Fallback: ambil max id dulu, lalu setval via REST (jika didukung)
            // Jika tidak bisa, lanjut saja — insert akan gagal jika sequence bermasalah
        }
    } catch (_) { /* abaikan */ }

    log('Menyimpan data ke Supabase...');
    const { data: inserted, error } = await supabase
        .from(TABLE)
        .insert(mappedData)
        .select();

    if (error) {
        log(`ERROR: Gagal insert ke Supabase: ${error.message}`);

        // Jika error duplicate key, beri petunjuk
        if (error.message.includes('duplicate key')) {
            log('');
            log('=== PENTING! ===');
            log('Sequence data_aktivasi_id_seq out of sync.');
            log('Jalankan SQL berikut di Supabase SQL Editor:');
            log("  SELECT setval('public.data_aktivasi_id_seq', (SELECT COALESCE(MAX(id),0) FROM public.data_aktivasi));");
            log('================');
        }

        log('=== AUTO UPLOAD NASABAH END (ERROR) ===');
        process.exit(1);
    }

    const count = inserted ? inserted.length : 0;
    log(`SUKSES: ${count} data berhasil di-insert ke tabel ${TABLE}.`);

    // 6. Kirim notifikasi WhatsApp
    try {
        await sendWaNotification(supabase, count);
    } catch (waErr) {
        log(`WARNING: Gagal kirim notif WA: ${waErr.message}`);
    }

    // 7. Log ringkasan
    log('--- Ringkasan ---');
    log(`  File   : ${fileName}`);
    log(`  Tanggal: ${dateISO}`);
    log(`  Insert : ${count} baris`);
    log('=== AUTO UPLOAD NASABAH END (SUCCESS) ===');
}

// ============================================================
// NOTIFIKASI WHATSAPP VIA FONNTE
// ============================================================
async function sendWaNotification(supabase, count) {
    // Baca setting WA dari tabel settings
    const { data: settingsRows, error: setErr } = await supabase
        .from('settings')
        .select('key, value');

    if (setErr || !settingsRows) {
        log('  Tidak bisa membaca settings untuk WA.');
        return;
    }

    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    const token = settings['WA_TOKEN'] || '';
    const target = settings['WA_TARGET'] || '';
    const status = settings['WA_STATUS'] || 'OFF';

    if (status !== 'ON' || !token || !target) {
        log('  Notifikasi WA dinonaktifkan atau token/target belum diisi.');
        return;
    }

    const tanggal = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' });
    const pesan = `*Notifikasi JConnect Monitor*\n\nSudah dilakukan upload *${count} data Rekening Baru* ke dalam sistem. Silahkan cek aplikasi JConnect Monitor untuk update Data Aktivasi JConnect hari ini, Terima Kasih 🙏🏻.\n\n_from JCMonitor Apps (Auto)_`;

    log('  Mengirim notifikasi WA...');
    const resp = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ target, message: pesan })
    });

    const text = await resp.text();
    log(`  WA Response: ${text}`);
}

// ============================================================
// RUN
// ============================================================
main().catch(err => {
    log(`FATAL ERROR: ${err.message}`);
    console.error(err);
    process.exit(1);
});
