# PowerShell Post-Commit Hook: Runs dotnet Stryker mutation gate after git commit
[CmdletBinding()]
param()

$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) {
    $repoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
}

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host " [Git Hook] Post-Commit: Running dotnet Stryker Gate" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$gateScript = Join-Path $repoRoot ".agents/skills/stryker-mutation/scripts/run-stryker-gate.ps1"

if (Test-Path $gateScript) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $gateScript -Since "HEAD~1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[Git Hook Warning] Commit mutation score fell below 80% threshold!" -ForegroundColor Yellow
        Write-Host "Please add unit tests covering the surviving mutants before pushing/merging." -ForegroundColor Yellow
    }
} else {
    Write-Host "Stryker gate script not found at: $gateScript" -ForegroundColor Red
}
