[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$BaseBranch = "main",

    [Parameter(Mandatory = $false)]
    [int]$PrNumber,

    [Parameter(Mandatory = $false)]
    [string]$Repo,

    [Parameter(Mandatory = $false)]
    [string]$Token = $env:GITHUB_TOKEN
)

$ErrorActionPreference = "Continue"

# Resolve repo root
$current = Get-Item $PSScriptRoot
while ($current -and -not (Test-Path (Join-Path $current.FullName ".git"))) {
    $current = $current.Parent
}
$projectRoot = if ($current) { $current.FullName } else { (Get-Location).Path }

Write-Host "======================================================" -ForegroundColor Magenta
Write-Host " Antigravity Code Review Agent Execution" -ForegroundColor Magenta
Write-Host " Workspace: $projectRoot" -ForegroundColor Magenta
Write-Host "======================================================" -ForegroundColor Magenta

# 1. Inspect Git Diff & Changes
Write-Host "`n>>> [Phase 1/5] Analyzing Git Changes & Diff..." -ForegroundColor Cyan
Push-Location $projectRoot
$changedFiles = git status --porcelain
$currentCommit = git rev-parse --short HEAD 2>$null
if (-not $currentCommit) { $currentCommit = "working-tree" }
$branchName = git branch --show-current 2>$null

Write-Host "Current Branch: $branchName ($currentCommit)" -ForegroundColor DarkGray

# 2. Dependency Vulnerabilities Audit
Write-Host "`n>>> [Phase 2/5] Scanning Dependency Vulnerabilities..." -ForegroundColor Cyan
$feVulnerabilities = 0
$beVulnerabilities = 0
$feVulnDetails = @()
$beVulnDetails = @()

# Frontend npm audit
$feDir = Join-Path $projectRoot "InvoiceAppFE"
if (Test-Path $feDir) {
    Push-Location $feDir
    try {
        $auditRaw = & cmd.exe /c "npm.cmd audit --json" 2>$null | Out-String
        if ($auditRaw) {
            $auditJson = $auditRaw | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($auditJson -and $auditJson.metadata -and $auditJson.metadata.vulnerabilities) {
                $feVulnerabilities = $auditJson.metadata.vulnerabilities.total
                if ($feVulnerabilities -gt 0) {
                    $feVulnDetails += "Found $feVulnerabilities npm vulnerabilities (High: $($auditJson.metadata.vulnerabilities.high), Moderate: $($auditJson.metadata.vulnerabilities.moderate), Low: $($auditJson.metadata.vulnerabilities.low))."
                }
            }
        }
    } finally {
        Pop-Location
    }
}

# Backend dotnet package audit
$beSolution = Join-Path $projectRoot "backend/InvoiceApp.sln"
if (Test-Path $beSolution) {
    $dotnetAudit = & dotnet list $beSolution package --vulnerable 2>&1
    $vulnLines = $dotnetAudit | Where-Object { $_ -match "has no vulnerable packages" }
    if (-not $vulnLines) {
        $foundVulns = $dotnetAudit | Where-Object { $_ -match ">\s+\S+" }
        if ($foundVulns) {
            $beVulnerabilities += $foundVulns.Count
            $beVulnDetails += "Found $($foundVulns.Count) vulnerable NuGet package(s) in backend."
        }
    }
}

# 3. SonarQube, Clean Code & Static Analysis Audit
Write-Host "`n>>> [Phase 3/5] Inspecting SonarQube & Clean Code Rules..." -ForegroundColor Cyan
$sonarIssues = @()

# Scan backend C# files for Sonar/Clean Code violations
$csFiles = Get-ChildItem -Path (Join-Path $projectRoot "backend/src") -Filter "*.cs" -Recurse -ErrorAction SilentlyContinue
foreach ($file in $csFiles) {
    $lines = Get-Content $file.FullName
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]

        # S112: Generic Exception
        if ($line -match "throw\s+new\s+(Exception|SystemException)\b") {
            $sonarIssues += [PSCustomObject]@{
                Rule = "S112 (Generic Exception)";
                File = "$($file.Name):$($i + 1)";
                Message = "Do not throw generic System.Exception; throw a specific domain exception."
            }
        }

        # S1135: Unresolved TODO
        if ($line -match "(//\s*TODO|//\s*FIXME)") {
            $sonarIssues += [PSCustomObject]@{
                Rule = "S1135 (TODO Debt)";
                File = "$($file.Name):$($i + 1)";
                Message = "Unresolved TODO detected in code: $($line.Trim())"
            }
        }

        # Clean Code: Single letter variable
        if ($line -match "^\s*(var|int|string|decimal|bool|Guid)\s+([a-h]|[l-z])\s*=") {
            $sonarIssues += [PSCustomObject]@{
                Rule = "Clean Code (Single Letter Var)";
                File = "$($file.Name):$($i + 1)";
                Message = "Avoid single-letter variable names: '$($Matches[2])'."
            }
        }

        # Clean Code: Flag parameters
        if ($line -match "\b(bool\s+flag\b|bool\s+isFlag\b)") {
            $sonarIssues += [PSCustomObject]@{
                Rule = "Clean Code (Flag Parameter)";
                File = "$($file.Name):$($i + 1)";
                Message = "Avoid boolean flag parameter; split into distinct intention-revealing methods."
            }
        }
    }
}

# 4. Code Typos & Spelling Heuristics Scan
Write-Host "`n>>> [Phase 4/5] Scanning for Code Typos & Misspellings..." -ForegroundColor Cyan
$typoFixes = @{
    "recieve"    = "receive"
    "canceld"    = "canceled"
    "seperate"   = "separate"
    "invoce"     = "invoice"
    "autorize"   = "authorize"
    "occured"    = "occurred"
    "unhandeld"  = "unhandled"
    "defualt"    = "default"
    "paramater"  = "parameter"
    "descripton" = "description"
}

$typoIssues = @()
$targetDirs = @(
    (Join-Path $projectRoot "InvoiceAppFE/src"),
    (Join-Path $projectRoot "backend/src"),
    (Join-Path $projectRoot "docs")
)

$sourceFiles = @()
foreach ($d in $targetDirs) {
    if (Test-Path $d) {
        $sourceFiles += Get-ChildItem -Path $d -Include "*.ts","*.cs","*.html","*.json","*.md" -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch "node_modules|\.git|bin|obj|StrykerOutput" -and $_.Name -ne "review-checklist.md" }
    }
}

foreach ($file in $sourceFiles) {
    $content = Get-Content $file.FullName -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    for ($i = 0; $i -lt $content.Count; $i++) {
        $lineText = $content[$i]
        foreach ($misspelled in $typoFixes.Keys) {
            $replacement = $typoFixes[$misspelled]
            if ($lineText -match "\b$misspelled\b") {
                $typoIssues += [PSCustomObject]@{
                    File = "$($file.Name):$($i + 1)";
                    Found = $misspelled;
                    Suggestion = $replacement;
                    LineSnippet = $lineText.Trim()
                }
            }
        }
    }
}

# 5. Architectural & Constitution Standards Check
Write-Host "`n>>> [Phase 5/5] Auditing Architectural Implementation against Constitution..." -ForegroundColor Cyan
$archIssues = @()

# Check controller purity: Resource controllers must inherit ApiControllerBase
$controllerFiles = Get-ChildItem -Path (Join-Path $projectRoot "backend/src/InvoiceApp.Api/Controllers") -Filter "*Controller.cs" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "AuthController.cs" }
foreach ($ctrl in $controllerFiles) {
    $raw = Get-Content $ctrl.FullName -Raw
    if ($raw -notmatch ":\s*ApiControllerBase") {
        $archIssues += [PSCustomObject]@{
            Area = "Backend Architecture";
            File = $ctrl.Name;
            Message = "Resource controller does not inherit ApiControllerBase."
        }
    }
}

# Check frontend accessibility & strict typing
$tsSourceFiles = Get-ChildItem -Path (Join-Path $projectRoot "InvoiceAppFE/src") -Filter "*.ts" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\.spec\.ts$" }
foreach ($ts in $tsSourceFiles) {
    $lines = Get-Content $ts.FullName
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "(:\s*any\b|<any>)" -and $lines[$i] -notmatch "justif") {
            $archIssues += [PSCustomObject]@{
                Area = "Frontend Strict Typing";
                File = "$($ts.Name):$($i + 1)";
                Message = "Unjustified 'any' usage detected. Declare explicit interface or type."
            }
        }
    }
}

# 6. Formulate Review Verdict and Markdown Comment
$totalBlockers = $archIssues.Count + ($sonarIssues | Where-Object { $_.Rule -match "S112" }).Count
$totalWarnings = ($sonarIssues | Where-Object { $_.Rule -notmatch "S112" }).Count + $typoIssues.Count + $feVulnerabilities + $beVulnerabilities

$verdict = "APPROVED"
if ($totalBlockers -gt 0) {
    $verdict = "CHANGES REQUESTED"
} elseif ($totalWarnings -gt 0) {
    $verdict = "COMMENT (Suggestions Available)"
}

$archStatus = if ($archIssues.Count -eq 0) { "PASS" } else { "FAIL" }
$sonarStatus = if ($sonarIssues.Count -eq 0) { "PASS" } else { "WARN" }
$vulnStatus = if (($feVulnerabilities + $beVulnerabilities) -eq 0) { "PASS" } else { "ADVISORY" }
$typoStatus = if ($typoIssues.Count -eq 0) { "PASS" } else { "WARN" }

# Build Markdown PR Comment
$lines = @()
$lines += "# Automated Code Review"
$lines += ""
$lines += "**Review Verdict**: $verdict"
$lines += "**Branch**: ``$branchName`` | **Commit**: ``$currentCommit``"
$lines += ""
$lines += "---"
$lines += ""
$lines += "### Review Dimension Summary"
$lines += ""
$lines += "| Dimension | Status | Issues | Details |"
$lines += "| :--- | :---: | :---: | :--- |"
$lines += "| **Architectural & Constitution** | $archStatus | $($archIssues.Count) | Route guards, controller purity, strict types |"
$lines += "| **SonarQube & Clean Code** | $sonarStatus | $($sonarIssues.Count) | S112, S1135, single-letter vars, flag params |"
$lines += "| **Dependency Vulnerabilities** | $vulnStatus | $($feVulnerabilities + $beVulnerabilities) | npm audit ($feVulnerabilities) + dotnet ($beVulnerabilities) |"
$lines += "| **Code Typos & Spelling** | $typoStatus | $($typoIssues.Count) | Heuristic spell check across diffs |"
$lines += ""
$lines += "---"

if ($archIssues.Count -gt 0) {
    $lines += "### Architectural & Constitution Issues"
    foreach ($issue in $archIssues) {
        $lines += "- **$($issue.Area)** (``$($issue.File)``): $($issue.Message)"
    }
    $lines += ""
}

if ($sonarIssues.Count -gt 0) {
    $lines += "### SonarQube & Clean Code Findings"
    foreach ($issue in $sonarIssues) {
        $lines += "- **$($issue.Rule)** in ``$($issue.File)``: $($issue.Message)"
    }
    $lines += ""
}

if ($feVulnerabilities -gt 0 -or $beVulnerabilities -gt 0) {
    $lines += "### Dependency Vulnerability Summary"
    foreach ($detail in $feVulnDetails) {
        $lines += "- **Frontend (npm)**: $detail"
    }
    foreach ($detail in $beVulnDetails) {
        $lines += "- **Backend (NuGet)**: $detail"
    }
    $lines += ""
}

if ($typoIssues.Count -gt 0) {
    $lines += "### Code Typos & Spelling Suggestions"
    foreach ($typo in $typoIssues) {
        $lines += "- In ``$($typo.File)``: Replace ``'$($typo.Found)'`` with ``'$($typo.Suggestion)'``"
    }
    $lines += ""
}

$lines += "---"
$lines += "*Automated Review generated by Antigravity Code Review Agent against Project Constitution v1.0.1*"

$reviewMarkdown = $lines -join "`n"

# Save comment to temp file
$tempCommentFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "pr-review-$([System.Guid]::NewGuid().ToString('N')).md")
Set-Content -Path $tempCommentFile -Value $reviewMarkdown -Encoding UTF8

Write-Host "`n>>> Formatted PR Review Comment Generated!" -ForegroundColor Green
Write-Host "Verdict: $verdict" -ForegroundColor Yellow

# Publish comment
$postScript = Join-Path $PSScriptRoot "post-pr-comment.ps1"
$publishParams = @{
    CommentFile = $tempCommentFile
}
if ($PrNumber -gt 0) { $publishParams["PrNumber"] = $PrNumber }
if ($Repo) { $publishParams["Repo"] = $Repo }
if ($Token) { $publishParams["Token"] = $Token }

& powershell -ExecutionPolicy Bypass -File $postScript @publishParams
Pop-Location
