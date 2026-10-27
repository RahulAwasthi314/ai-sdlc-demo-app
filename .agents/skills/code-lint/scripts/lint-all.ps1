[CmdletBinding()]
param (
    [switch]$Fix
)

$ErrorActionPreference = "Continue"
$scriptDir = $PSScriptRoot

Write-Host "======================================================" -ForegroundColor Magenta
Write-Host " Full-Stack Code Quality & Lint Audit (Unified Gate)" -ForegroundColor Magenta
Write-Host "======================================================" -ForegroundColor Magenta

$fixArg = if ($Fix) { @("-Fix") } else { @() }

# Run Frontend Lint
Write-Host "`n>>> [Target 1/2] Executing Frontend Quality Verification..." -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "lint-frontend.ps1") @fixArg
$feExit = $LASTEXITCODE

# Run Backend Lint
Write-Host "`n>>> [Target 2/2] Executing Backend Quality Verification..." -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "lint-backend.ps1") @fixArg
$beExit = $LASTEXITCODE

Write-Host "`n======================================================" -ForegroundColor Magenta
Write-Host " Full-Stack Audit Summary" -ForegroundColor Magenta
Write-Host "======================================================" -ForegroundColor Magenta

if ($feExit -eq 0) {
    Write-Host "  Frontend Quality Gate : [PASSED]" -ForegroundColor Green
} else {
    Write-Host "  Frontend Quality Gate : [FAILED]" -ForegroundColor Red
}

if ($beExit -eq 0) {
    Write-Host "  Backend Quality Gate  : [PASSED]" -ForegroundColor Green
} else {
    Write-Host "  Backend Quality Gate  : [FAILED]" -ForegroundColor Red
}

Write-Host "======================================================" -ForegroundColor Magenta

if ($feExit -ne 0 -or $beExit -ne 0) {
    Write-Host " Overall Code Quality Gate: FAILED. Resolve the issues listed above." -ForegroundColor Red
    exit 1
} else {
    Write-Host " Overall Code Quality Gate: PASSED. All standards verified." -ForegroundColor Green
    exit 0
}
