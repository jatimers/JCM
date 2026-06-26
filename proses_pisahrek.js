const XLSX = require('xlsx');

// Read input
const wb = XLSX.readFile('D:/project/jcm/xls/pisahrek.xlsx');
const sheet = wb.SheetNames[0];
const data = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1 });

const header = data[0]; // ["nama_wil","nomor_rekening","cif"]
const rows = data.slice(1);

console.log('Header:', header);
console.log('Total input rows:', rows.length);

// Split rows with multiple norek
const result = [];
let noUrut = 0;

for (const row of rows) {
  const namaWil = row[0];
  const norekRaw = String(row[1] || '').trim();
  const cif = row[2];

  // Split by ; and trim whitespace
  const norekList = norekRaw.split(';').map(s => s.trim()).filter(s => s);

  for (const norek of norekList) {
    noUrut++;
    result.push({
      no_urut: noUrut,
      nama_wil: namaWil,
      nomor_rekening: norek,
      cif: cif
    });
  }
}

console.log('Total output rows:', result.length);
console.log('Multi-row expansions:', result.length - rows.length);

// Sample output
console.log('\n--- First 10 output rows ---');
result.slice(0, 10).forEach(r => console.log(JSON.stringify(r)));

// Find a multi-row example
const multiCifs = [...new Set(result.filter(r => {
  const count = result.filter(r2 => r2.cif === r.cif).length;
  return count > 1;
}).map(r => r.cif))].slice(0, 3);

console.log('\n--- Sample multi norek CIF ---');
for (const cif of multiCifs) {
  console.log('\nCIF:', cif);
  result.filter(r => r.cif === cif).forEach(r => console.log('  ', JSON.stringify(r)));
}

// Save to new Excel file
const ws = XLSX.utils.json_to_sheet(result);
const nwb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(nwb, ws, 'pisah_rek');
XLSX.writeFile(nwb, 'D:/project/jcm/xls/pisahrek_hasil.xlsx');

console.log('\n✅ Saved to: xls/pisahrek_hasil.xlsx');

// Also save as CSV for easy DB import
const csvLines = ['no_urut,nama_wil,nomor_rekening,cif'];
result.forEach(r => {
  csvLines.push(`${r.no_urut},"${r.nama_wil}","${r.nomor_rekening}","${r.cif}"`);
});
const fs = require('fs');
fs.writeFileSync('D:/project/jcm/xls/pisahrek_hasil.csv', csvLines.join('\n'));
console.log('✅ Saved to: xls/pisahrek_hasil.csv');
