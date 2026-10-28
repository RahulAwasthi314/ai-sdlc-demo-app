[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$TargetBranch,

    [Parameter(Mandatory = $false)]
    [string]$Since,

    [Parameter(Mandatory = $false)]
    [int]$Threshold = 80,

    [Parameter(Mandatory = $false)]
    [switch]$Full,

    [Parameter(Mandatory = $false)]
    [switch]$OpenReport
)

$ErrorActionPreference = "Continue"

# Resolve repo root
$current = Get-Item $PSScriptRoot
while ($current -and -not (Test-Path (Join-Path $current.FullName ".git"))) {
    $current = $current.Parent
}
$projectRoot = if ($current) { $current.FullName } else { (Get-Location).Path }
$backendDir = Join-Path $projectRoot "backend"
$testProjectDir = Join-Path $backendDir "tests/InvoiceApp.Tests"
$testProjectFile = Join-Path $testProjectDir "InvoiceApp.Tests.csproj"

Write-Host "======================================================" -ForegroundColor Magenta
Write-Host " Dotnet Stryker Mutation Testing Quality Gate" -ForegroundColor Magenta
Write-Host " Gate Threshold: $Threshold% minimum mutation score" -ForegroundColor Magenta
Write-Host "======================================================" -ForegroundColor Magenta

# Detect Target Branch if not supplied
if (-not $TargetBranch) {
    $remotes = git branch -r 2>$null
    if ($remotes -match "origin/master") {
        $TargetBranch = "origin/master"
    } elseif ($remotes -match "origin/main") {
        $TargetBranch = "origin/main"
    } else {
        $branches = git branch 2>$null
        if ($branches -match "master") { $TargetBranch = "master" } else { $TargetBranch = "main" }
    }
}

Write-Host "Target Merge Branch: $TargetBranch" -ForegroundColor DarkGray

# 1. Clean up lingering testhost processes to prevent file lock
Get-Process -Name testhost -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Pre-flight Tool Restore
Write-Host "`n[1/4] Ensuring dotnet-stryker tool is restored..." -ForegroundColor Yellow
Push-Location $backendDir
try {
    $restoreOut = & dotnet tool restore 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to restore dotnet tools: $restoreOut" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

# 3. Verify Baseline Unit Tests
Write-Host "`n[2/4] Verifying baseline unit tests before mutation..." -ForegroundColor Yellow
Push-Location $testProjectDir
try {
    $testOut = & dotnet test $testProjectFile 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Baseline unit tests failed! Fix test failures before running mutation testing:" -ForegroundColor Red
        $testOut | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        exit 1
    } else {
        Write-Host "Baseline tests passed: Ready for mutation injection." -ForegroundColor Green
    }
} finally {
    Pop-Location
}

# 4. Assemble Stryker Arguments & Execute
Write-Host "`n[3/4] Running dotnet Stryker mutation analysis..." -ForegroundColor Yellow
$strykerArgs = @("stryker", "--project", "InvoiceApp.Domain.csproj", "-r", "ClearText", "-r", "Json", "-r", "Html", "-b", "$Threshold")

if (-not $Full) {
    $sinceRef = if ($Since) {
        $resolved = & git rev-parse $Since 2>$null
        if ($resolved) { $resolved.Trim() } else { $Since }
    } else { $TargetBranch }
    Write-Host "Mode: Differential mutation testing (target: $sinceRef)" -ForegroundColor Cyan
    $strykerArgs += "--since:$sinceRef"
} else {
    Write-Host "Mode: Full mutation testing (entire domain model)" -ForegroundColor Cyan
}

if ($OpenReport) {
    $strykerArgs += "-o:Html"
}

Push-Location $testProjectDir
$strykerExitCode = 0
try {
    & dotnet @strykerArgs
    $strykerExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

# 5. Parse Latest Mutation Report JSON
Write-Host "`n[4/4] Evaluating Mutation Score & Surviving Mutants..." -ForegroundColor Yellow
$strykerOutputDir = Join-Path $testProjectDir "StrykerOutput"
$latestReport = Get-ChildItem -Path $strykerOutputDir -Filter "mutation-report.json" -Recurse -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

$actualScore = $null
$survivingMutants = @()
$killedCount = 0
$survivedCount = 0
$totalTested = 0

if ($latestReport -and (Test-Path $latestReport.FullName)) {
    try {
        $reportJson = Get-Content $latestReport.FullName -Raw | ConvertFrom-Json
        if ($reportJson -and $reportJson.files) {
            foreach ($fileProp in $reportJson.files.PSObject.Properties) {
                $filePath = $fileProp.Name
                $fileData = $fileProp.Value
                if ($fileData.mutants) {
                    foreach ($mutant in $fileData.mutants) {
                        if ($mutant.status -eq "Killed") {
                            $killedCount++
                            $totalTested++
                        } elseif ($mutant.status -eq "Survived") {
                            $survivedCount++
                            $totalTested++
                            $fileName = Split-Path $filePath -Leaf
                            $survivingMutants += [PSCustomObject]@{
                                File = $fileName;
                                Line = $mutant.location.start.line;
                                Mutator = $mutant.mutatorName;
                                Replacement = $mutant.replacement;
                                Description = $mutant.description
                            }
                        } elseif ($mutant.status -eq "Timeout") {
                            $killedCount++
                            $totalTested++
                        }
                    }
                }
            }
        }
    } catch {
        Write-Host "Warning: Could not parse mutation-report.json: $_" -ForegroundColor DarkGray
    }
}

if ($totalTested -gt 0) {
    $actualScore = [math]::Round(($killedCount / $totalTested) * 100, 2)
}

Write-Host "`n======================================================" -ForegroundColor Magenta
Write-Host " Stryker Mutation Gate Evaluation Summary" -ForegroundColor Magenta
Write-Host "======================================================" -ForegroundColor Magenta

if ($actualScore -ne $null) {
    Write-Host " Mutation Score Achieved : $actualScore%" -ForegroundColor $(if ($actualScore -ge $Threshold) { "Green" } else { "Red" })
    Write-Host " Required Gate Threshold : $Threshold%" -ForegroundColor Yellow
    Write-Host " Mutants Killed / Caught : $killedCount" -ForegroundColor Green
    Write-Host " Mutants Survived        : $survivedCount" -ForegroundColor $(if ($survivedCount -eq 0) { "Green" } else { "Red" })
} else {
    Write-Host " Mutation Score : Evaluated via Stryker exit code" -ForegroundColor Yellow
}

if ($latestReport) {
    $htmlReport = Join-Path (Split-Path $latestReport.FullName) "mutation-report.html"
    if (Test-Path $htmlReport) {
        Write-Host " Detailed HTML Report    : file:///$($htmlReport.Replace('\', '/'))" -ForegroundColor Cyan
    }
}

if ($survivingMutants.Count -gt 0) {
    Write-Host "`n------------------------------------------------------"
    Write-Host " Surviving Mutants (Require Additional Test Coverage):" -ForegroundColor Red
    foreach ($m in $survivingMutants) {
        Write-Host "  - [$($m.Mutator)] $($m.File):$($m.Line)" -ForegroundColor Yellow
        Write-Host "    Replacement: $($m.Replacement)" -ForegroundColor DarkGray
    }
    Write-Host "------------------------------------------------------"
}

Write-Host "======================================================" -ForegroundColor Magenta

if ($strykerExitCode -ne 0 -or ($actualScore -ne $null -and $actualScore -lt $Threshold)) {
    Write-Host " Mutation Testing Gate: FAILED" -ForegroundColor Red
    Write-Host " Merge to '$TargetBranch' is BLOCKED until mutation score reaches $Threshold%." -ForegroundColor Red
    exit 1
} else {
    Write-Host " Mutation Testing Gate: PASSED" -ForegroundColor Green
    Write-Host " All mutation criteria satisfied. Merge to '$TargetBranch' is PERMITTED." -ForegroundColor Green
    exit 0
}
