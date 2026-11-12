[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 8767
)

$ErrorActionPreference = 'Stop'
$taskBaseUrl = "http://127.0.0.1:$Port"
$taskEntryPath = Join-Path $PSScriptRoot 'design\demo\index.html'
$taskListener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if ($taskListener) {
    $taskResponse = Invoke-WebRequest -UseBasicParsing -Uri "$taskBaseUrl/design/demo/index.html" -TimeoutSec 5
    $taskExpected = Get-Content -Raw -Encoding UTF8 -LiteralPath $taskEntryPath
    if ($taskResponse.Content.Trim() -ne $taskExpected.Trim()) {
        throw "Port $Port is used by another service. Choose another port with -Port."
    }
    Write-Host "Review frontend: $taskBaseUrl/design/demo/index.html"
    Write-Host "Project preview is already running: $taskBaseUrl/design/demo/index.html#partner"
    return
}

$taskCandidates = @()
if ($env:USERPROFILE) {
    $taskCandidates += Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
}
$taskCommand = Get-Command python -CommandType Application -ErrorAction SilentlyContinue
if ($taskCommand) { $taskCandidates += $taskCommand.Source }
$taskPython = $null
foreach ($taskCandidate in ($taskCandidates | Select-Object -Unique)) {
    if (!(Test-Path -LiteralPath $taskCandidate)) { continue }
    $taskVersion = & $taskCandidate --version 2>$null
    if ($LASTEXITCODE -eq 0 -and $taskVersion -match '^Python 3\.') {
        $taskPython = $taskCandidate
        break
    }
}
if (!$taskPython) { throw 'Python 3 was not found. Install Python 3 and run this script again.' }

Write-Host "Python: $taskPython"
Write-Host "Review frontend: $taskBaseUrl/design/demo/index.html"
Write-Host 'Keep this terminal open. Press Ctrl+C to stop the preview.'
& $taskPython -m http.server $Port --bind 127.0.0.1 --directory $PSScriptRoot
if ($LASTEXITCODE -ne 0) { throw "Preview server exited with code $LASTEXITCODE." }
