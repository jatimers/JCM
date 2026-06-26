# run_daily.ps1 - Otomasi Harian JConnect Monitor
# ============================================================
# 1. Update tanggal di BukaRekToday.dtf (PCFile + WHERE REDTBG)
# 2. Jalankan rtopcb.exe untuk generate Excel dari IBM i
# 3. Jalankan autoupload.js untuk upload ke Supabase
#
# Usage:  .\run_daily.ps1
#         .\run_daily.ps1 -Date "2026-06-22"

param(
    [string]$Date = ""
)

$ErrorActionPreference = "Stop"
$BASE = "D:\Project\JCM"

# Tentukan tanggal
if ($Date -eq "") {
    $d = Get-Date
} else {
    $d = [DateTime]::Parse($Date)
}

$yyyy = $d.ToString("yyyy")
$MM   = $d.ToString("MM")
$dd   = $d.ToString("dd")
$ddMMyyyy = "$dd$MM$yyyy"
$yyyyMMdd = "$yyyy$MM$dd"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  JConnect - Daily Auto Run" -ForegroundColor Cyan
Write-Host "  Tanggal: $($d.ToString('dd MMMM yyyy'))" -ForegroundColor Cyan
Write-Host "  PCFile : BukaRek-$ddMMyyyy.xls" -ForegroundColor Cyan
Write-Host "  REDTBG : $yyyyMMdd" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# [1] Update file DTF
Write-Host ""
Write-Host "[1/3] Update tanggal di BukaRekToday.dtf..." -ForegroundColor Yellow

$dtfPath = Join-Path $BASE "BukaRekToday.dtf"
$bytes = [System.IO.File]::ReadAllBytes($dtfPath)
$text = [System.Text.Encoding]::Unicode.GetString($bytes)
$text = $text -replace 'BukaRek-\d{8}\.xls', "BukaRek-$ddMMyyyy.xls"
$text = $text -replace "T1\.REDTBG='\d{8}'", "T1.REDTBG='$yyyyMMdd'"
$newBytes = [System.Text.Encoding]::Unicode.GetBytes($text)
[System.IO.File]::WriteAllBytes($dtfPath, $newBytes)

Write-Host "  -> PCFile = BukaRek-$ddMMyyyy.xls" -ForegroundColor Green
Write-Host "  -> REDTBG = $yyyyMMdd" -ForegroundColor Green

# [2] Jalankan rtopcb
Write-Host ""
Write-Host "[2/3] Menjalankan rtopcb.exe (transfer data IBM i)..." -ForegroundColor Yellow

$rtopcbPath = Join-Path $BASE "rtopcb.exe"
$proc = Start-Process -FilePath $rtopcbPath -ArgumentList $dtfPath -Wait -NoNewWindow -PassThru

if ($proc.ExitCode -ne 0) {
    Write-Host "  -> rtopcb selesai dengan exit code: $($proc.ExitCode)" -ForegroundColor Yellow
    if ($proc.ExitCode -eq 20) {
        Write-Host "  -> CWBTF0004: Tidak ada data (normal untuk hari libur)" -ForegroundColor DarkYellow
    }
} else {
    Write-Host "  -> rtopcb sukses" -ForegroundColor Green
}

# [3] Cek Excel
Write-Host ""
Write-Host "[3/3] Cek file Excel dan upload ke Supabase..." -ForegroundColor Yellow

$dateShort = "$dd$MM$($yyyy.Substring(2,2))"
$patterns = @(
    "BukaRek-$ddMMyyyy.xls",
    "BukaRek-$ddMMyyyy.xlsx",
    "BukaRek-$dateShort.xls",
    "BukaRek-$dateShort.xlsx"
)

$excelFile = $null
foreach ($p in $patterns) {
    $fp = Join-Path $BASE $p
    if (Test-Path $fp) {
        $excelFile = $fp
        break
    }
}

if (-not $excelFile) {
    Write-Host "  -> File Excel tidak ditemukan (tidak ada data)" -ForegroundColor Red
    Write-Host "  -> Lewati upload." -ForegroundColor Red
    Write-Host ""
    Write-Host "Selesai (tanpa upload)." -ForegroundColor Cyan
    exit 0
}

Write-Host "  -> File ditemukan: $excelFile" -ForegroundColor Green

# [4] Jalankan autoupload.js
$autouploadPath = Join-Path $BASE "autoupload.js"
$nodeResult = & node $autouploadPath $excelFile $yyyyMMdd
$nodeExit = $LASTEXITCODE

Write-Host $nodeResult

if ($nodeExit -eq 0) {
    Write-Host ""
    Write-Host "Semua selesai - SUCCESS!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Upload selesai dengan peringatan (exit: $nodeExit)." -ForegroundColor Yellow
}

exit $nodeExit
