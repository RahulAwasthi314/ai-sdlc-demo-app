[CmdletBinding()]
param (
    [switch]$Fix
)

$ErrorActionPreference = "Continue"
$current = Get-Item $PSScriptRoot
while ($current -and -not (Test-Path (Join-Path $current.FullName ".git"))) {
    $current = $current.Parent
}
$projectRoot = if ($current) { $current.FullName } else { (Get-Location).Path }
$frontendDir = Join-Path $projectRoot "InvoiceAppFE"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " Running Frontend Code Quality & Lint Checks" -ForegroundColor Cyan
Write-Host " Target: $frontendDir" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

if (-not (Test-Path $frontendDir)) {
    Write-Error "Frontend directory not found at $frontendDir"
    exit 1
}

$issuesFound = 0

# 1. Prettier Code Style Check / Fix
Write-Host "`n[1/3] Checking Prettier Code Formatting..." -ForegroundColor Yellow
Push-Location $frontendDir
try {
    if ($Fix) {
        Write-Host "Running Prettier in write mode..." -ForegroundColor Cyan
        & cmd.exe /c "npx prettier --write ."
    } else {
        $prettierOut = & cmd.exe /c "npx prettier --check ." 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Prettier formatting issues detected:" -ForegroundColor Red
            $prettierOut | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
            Write-Host "Hint: Run with -Fix to auto-format files." -ForegroundColor Yellow
            $issuesFound++
        } else {
            Write-Host "Prettier check passed: All files match code style." -ForegroundColor Green
        }
    }
} finally {
    Pop-Location
}

# 2. TypeScript Compilation & Strict Typing Check
Write-Host "`n[2/3] Checking TypeScript Strict Types (tsc --noEmit)..." -ForegroundColor Yellow
Push-Location $frontendDir
try {
    $tscOut = & cmd.exe /c "npx tsc --noEmit" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "TypeScript compilation/type errors detected:" -ForegroundColor Red
        $tscOut | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        $issuesFound++
    } else {
        Write-Host "TypeScript check passed: 0 type errors found." -ForegroundColor Green
    }
} finally {
    Pop-Location
}

# 3. Code Standards & Static Quality Analysis
Write-Host "`n[3/3] Scanning TypeScript files for Constitution standards..." -ForegroundColor Yellow
$tsFiles = Get-ChildItem -Path (Join-Path $frontendDir "src") -Filter "*.ts" -Recurse | Where-Object { $_.FullName -notmatch "\.spec\.ts$" }
$prohibitedAnyCount = 0

foreach ($file in $tsFiles) {
    $lines = Get-Content $file.FullName
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        # Match ': any' or '<any>' without preceding/inline justification comment
        if ($line -match "(:\s*any\b|<any>)" -and $line -notmatch "//.*justif" -and $line -notmatch "/\*.*justif") {
            Write-Host "  [Rule Violation] Unjustified 'any' in $($file.Name):$($i + 1)" -ForegroundColor Red
            Write-Host "    Line: $($line.Trim())" -ForegroundColor DarkGray
            $prohibitedAnyCount++
        }
    }
}

if ($prohibitedAnyCount -gt 0) {
    Write-Host "Found $prohibitedAnyCount instances of unjustified 'any' types." -ForegroundColor Red
    $issuesFound++
} else {
    Write-Host "Strict typing check passed: No unjustified 'any' usages detected." -ForegroundColor Green
}

Write-Host "`n------------------------------------------------------"
if ($issuesFound -eq 0) {
    Write-Host " Frontend Quality Gate: PASSED (0 issues)" -ForegroundColor Green
    exit 0
} else {
    Write-Host " Frontend Quality Gate: FAILED ($issuesFound issue categories detected)" -ForegroundColor Red
    exit 1
}
