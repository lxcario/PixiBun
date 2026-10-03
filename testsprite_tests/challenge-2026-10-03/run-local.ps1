param(
    [ValidateSet('all', 'invalid_invite', 'help_keyboard', 'practice_identity', 'reload_history', 'locked_history', 'frame_isolation', 'resize_cancel', 'stale_tab_copy', 'apng_cancel', 'backup_roundtrip', 'floating_selection', 'keyboard_skip')]
    [string]$Case = 'all',
    [string]$Url = 'http://127.0.0.1:3150'
)

$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$taskPython = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) {
    $taskPython = (Get-Command python -ErrorAction Stop).Source
}
$taskNode = Join-Path $taskRoot 'artifacts/runtime/node-v22.23.3-win-x64/node.exe'
if (-not (Test-Path -LiteralPath $taskNode)) {
    $taskNode = (Get-Command node -ErrorAction Stop).Source
}
$taskDependencies = Join-Path $taskRoot 'artifacts/runtime/testsprite-python'
$taskOldPythonPath = $env:PYTHONPATH
$taskOldUrl = $env:PIXIBUN_CHALLENGE_URL
$taskOldChromium = $env:PIXIBUN_CHROMIUM_EXECUTABLE
$taskOldFirefox = $env:PIXIBUN_FIREFOX_EXECUTABLE
$taskOldCase = $env:PIXIBUN_CHALLENGE_CASE

try {
    if (Test-Path -LiteralPath $taskDependencies) {
        $env:PYTHONPATH = if ($taskOldPythonPath) { "$taskDependencies;$taskOldPythonPath" } else { $taskDependencies }
    }
    $env:PIXIBUN_CHALLENGE_URL = $Url
    $env:PIXIBUN_CHROMIUM_EXECUTABLE = & $taskNode -e 'process.stdout.write(require(process.argv[1]).chromium.executablePath())' (Join-Path $taskRoot 'node_modules/playwright')
    if ($LASTEXITCODE -ne 0) { throw 'Could not locate the installed Chromium executable.' }
    $env:PIXIBUN_FIREFOX_EXECUTABLE = & $taskNode -e 'process.stdout.write(require(process.argv[1]).firefox.executablePath())' (Join-Path $taskRoot 'node_modules/playwright')
    if ($LASTEXITCODE -ne 0) { throw 'Could not locate the installed Firefox executable.' }
    $taskCases = if ($Case -eq 'all') { @('invalid_invite', 'help_keyboard', 'practice_identity', 'reload_history', 'locked_history', 'frame_isolation', 'resize_cancel', 'stale_tab_copy', 'apng_cancel', 'backup_roundtrip', 'floating_selection', 'keyboard_skip') } else { @($Case) }
    foreach ($taskCase in $taskCases) {
        $env:PIXIBUN_CHALLENGE_CASE = $taskCase
        $taskScript = if ($taskCase -in @('invalid_invite', 'help_keyboard', 'practice_identity')) { "$taskCase.py" } else { 'safety_cases.py' }
        & $taskPython (Join-Path $PSScriptRoot $taskScript)
        if ($LASTEXITCODE -ne 0) { throw "$taskCase failed; inspect its traceback above." }
    }
}
finally {
    $env:PYTHONPATH = $taskOldPythonPath
    $env:PIXIBUN_CHALLENGE_URL = $taskOldUrl
    $env:PIXIBUN_CHROMIUM_EXECUTABLE = $taskOldChromium
    $env:PIXIBUN_FIREFOX_EXECUTABLE = $taskOldFirefox
    $env:PIXIBUN_CHALLENGE_CASE = $taskOldCase
}
