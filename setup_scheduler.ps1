# setup_scheduler.ps1
# Setup Windows Task Scheduler untuk auto upload jam 15:30 setiap hari
# Jalankan PowerShell ini sebagai Administrator

$taskName = "JCM Auto Upload Nasabah"
$scriptDir = "D:\project\JCM"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$scriptFile = "auto_upload.js"

# Hapus task lama jika ada
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Menghapus task lama: $taskName"
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Buat trigger: setiap hari jam 15:30
$trigger = New-ScheduledTaskTrigger -Daily -At "15:30"

# Buat action: jalankan node auto_upload.js
$action = New-ScheduledTaskAction `
    -Execute $nodeExe `
    -Argument $scriptFile `
    -WorkingDirectory $scriptDir

# Konfigurasi: run logged-on user, hidden window
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

# Register task
Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Principal $principal `
    -Settings $settings `
    -Description "Auto upload data nasabah dari file Excel BukaRek-ddmmyyyy.xlsx ke Supabase setiap jam 15:30" `
    -Force

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Task Scheduler BERHASIL dibuat!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Nama  : $taskName"
Write-Host "  Jam   : 15:30 WIB (setiap hari)"
Write-Host "  Script: $scriptDir\$scriptFile"
Write-Host ""
Write-Host "  Cek di: taskschd.msc -> Task Scheduler Library"
Write-Host "============================================" -ForegroundColor Green
