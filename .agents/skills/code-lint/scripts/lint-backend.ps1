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
$backendDir = Join-Path $projectRoot "backend"
$solutionPath = Join-Path $backendDir "InvoiceApp.sln"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " Running Backend Code Quality & Lint Checks" -ForegroundColor Cyan
Write-Host " Target Solution: $solutionPath" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

if (-not (Test-Path $solutionPath)) {
    Write-Error "Solution file not found at $solutionPath"
    exit 1
}

$issuesFound = 0

# 1. dotnet format Code Style Check / Fix
Write-Host "`n[1/3] Checking .NET Code Formatting (dotnet format)..." -ForegroundColor Yellow
if ($Fix) {
    Write-Host "Running dotnet format in fix mode..." -ForegroundColor Cyan
    & dotnet format $solutionPath
} else {
    $formatOut = & dotnet format $solutionPath --verify-no-changes 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "dotnet format check failed: formatting deviations detected." -ForegroundColor Red
        $formatOut | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        Write-Host "Hint: Run with -Fix to auto-format files." -ForegroundColor Yellow
        $issuesFound++
    } else {
        Write-Host "dotnet format check passed: All files match .NET style guidelines." -ForegroundColor Green
    }
}

# 2. Roslyn Compiler Analysis & Strict Warnings
Write-Host "`n[2/3] Checking Roslyn Analyzers & Compilation (dotnet build --warnaserror)..." -ForegroundColor Yellow
$buildOut = & dotnet build $solutionPath --warnaserror -v q 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Compiler/analyzer warnings or errors detected:" -ForegroundColor Red
    $buildOut | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    $issuesFound++
} else {
    Write-Host "Roslyn analyzer check passed: 0 warnings, 0 errors." -ForegroundColor Green
}

# 3. Clean Code & Architectural Standards Scan
Write-Host "`n[3/3] Scanning C# Source Files for Clean Code & Constitution standards..." -ForegroundColor Yellow
$csFiles = Get-ChildItem -Path (Join-Path $backendDir "src") -Filter "*.cs" -Recurse
$ruleViolations = 0

foreach ($file in $csFiles) {
    $lines = Get-Content $file.FullName
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]

        # Check for forbidden 'flag' parameter names
        if ($line -match "\b(bool\s+flag\b|bool\s+isFlag\b)") {
            Write-Host "  [Rule Violation] Flag parameter detected in $($file.Name):$($i + 1)" -ForegroundColor Red
            Write-Host "    Line: $($line.Trim())" -ForegroundColor DarkGray
            $ruleViolations++
        }

        # Check for single-letter local variables (excluding loop indexes i, j, k)
        if ($line -match "^\s*(var|int|string|decimal|bool|Guid)\s+([a-h]|[l-z])\s*=" ) {
            Write-Host "  [Rule Violation] Single-letter variable '$($Matches[2])' in $($file.Name):$($i + 1)" -ForegroundColor Red
            Write-Host "    Line: $($line.Trim())" -ForegroundColor DarkGray
            $ruleViolations++
        }
    }
}

# Controller Purity Check: Resource controllers must inherit ApiControllerBase
$controllerFiles = Get-ChildItem -Path (Join-Path $backendDir "src/InvoiceApp.Api/Controllers") -Filter "*Controller.cs" -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "AuthController.cs" }
foreach ($ctrl in $controllerFiles) {
    $content = Get-Content $ctrl.FullName -Raw
    if ($content -notmatch ":\s*ApiControllerBase") {
        Write-Host "  [Architectural Violation] Resource controller $($ctrl.Name) does not inherit ApiControllerBase" -ForegroundColor Red
        $ruleViolations++
    }
}

if ($ruleViolations -gt 0) {
    Write-Host "Clean code scan detected $ruleViolations rule violation(s)." -ForegroundColor Red
    $issuesFound++
} else {
    Write-Host "Clean code scan passed: Clean naming, controller purity, and conventions verified." -ForegroundColor Green
}

Write-Host "`n------------------------------------------------------"
if ($issuesFound -eq 0) {
    Write-Host " Backend Quality Gate: PASSED (0 issues)" -ForegroundColor Green
    exit 0
} else {
    Write-Host " Backend Quality Gate: FAILED ($issuesFound issue categories detected)" -ForegroundColor Red
    exit 1
}
