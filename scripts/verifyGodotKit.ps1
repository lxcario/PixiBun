param(
  [string]$GodotExecutable = "$PSScriptRoot/../artifacts/runtime/godot-4.7.2/Godot_v4.7.2-stable_win64_console.exe",
  [Parameter(Mandatory = $true)][string]$PythonExecutable
)
$ErrorActionPreference = 'Stop'
$phase5Repo = (Resolve-Path -LiteralPath "$PSScriptRoot/..").Path
Push-Location -LiteralPath $phase5Repo
try {
  if (!(Test-Path -LiteralPath $GodotExecutable)) { throw 'Provide a local Godot 4.7.2 executable. This script does not download it.' }
  $phase5Godot = (Resolve-Path -LiteralPath $GodotExecutable).Path
  foreach ($phase5Name in @('indexed-normal', 'color-only', 'duplicate-bound')) {
    $phase5Archive = "artifacts/phase5/$phase5Name-kit.zip"
    $phase5Destination = Join-Path $phase5Repo "artifacts/phase5/$phase5Name"
    & $PythonExecutable scripts/verifyGodotKit.py $phase5Archive $phase5Destination
    if ($LASTEXITCODE -ne 0) { throw "Archive verification failed: $phase5Name" }
    Copy-Item -LiteralPath "$PSScriptRoot/verifyGodotKit.gd" -Destination "$phase5Destination/verify.gd"
    if ($phase5Name -eq 'indexed-normal') {
      Copy-Item -Path 'artifacts/phase5/oracle/*' -Destination $phase5Destination
    }
    & $phase5Godot --headless --editor --path $phase5Destination --import *> "artifacts/phase5/$phase5Name-import.log"
    if ($LASTEXITCODE -ne 0) { throw "Godot import failed: $phase5Name" }
    $phase5Report = Join-Path $phase5Destination 'engine-verification.json'
    # Only the exact prior result is removed; stale success cannot satisfy this run.
    if (Test-Path -LiteralPath $phase5Report) { Remove-Item -LiteralPath $phase5Report }
    $phase5Process = Start-Process -FilePath $phase5Godot -ArgumentList @('--path',('"' + $phase5Destination + '"'),'--script','res://verify.gd','--rendering-method','gl_compatibility','--resolution','640x480') -WindowStyle Hidden -PassThru -RedirectStandardOutput "$phase5Destination/verification.log" -RedirectStandardError "$phase5Destination/verification-errors.log"
    if (!$phase5Process.WaitForExit(40000)) { $phase5Process.Kill(); throw "Owned Godot verification process timed out: $phase5Name" }
    if ($phase5Process.ExitCode -ne 0 -or !(Test-Path -LiteralPath $phase5Report)) { throw "Godot runtime verification failed: $phase5Name. Read its verification logs." }
    $phase5Result = Get-Content -LiteralPath $phase5Report -Raw | ConvertFrom-Json
    if ($phase5Result.errors.Count -gt 0) { throw "Godot reported failed checks: $phase5Name" }
    Write-Output "$phase5Name : $($phase5Result.checks) engine checks passed; $($phase5Result.palettePixelsCompared) palette pixels compared."
  }
} finally { Pop-Location }
