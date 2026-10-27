[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string]$CommentFile,

    [Parameter(Mandatory = $false)]
    [int]$PrNumber,

    [Parameter(Mandatory = $false)]
    [string]$Repo,

    [Parameter(Mandatory = $false)]
    [string]$Token = $env:GITHUB_TOKEN
)

$ErrorActionPreference = "Continue"

if (-not (Test-Path $CommentFile)) {
    Write-Error "Comment file not found: $CommentFile"
    exit 1
}

$commentBody = Get-Content -Path $CommentFile -Raw

# Infer token from GH_TOKEN if GITHUB_TOKEN was empty
if (-not $Token -and $env:GH_TOKEN) {
    $Token = $env:GH_TOKEN
}

# Infer Repo from git remote if not provided
if (-not $Repo) {
    $remoteUrl = git config --get remote.origin.url
    if ($remoteUrl -match "github\.com[/:]([^/]+)/([^/\.]+)") {
        $Repo = "$($Matches[1])/$($Matches[2])"
    }
}

# Check if GitHub CLI is installed and operable
$ghAvailable = $null
try {
    $ghVer = & gh --version 2>$null
    if ($LASTEXITCODE -eq 0) { $ghAvailable = $true }
} catch {
    $ghAvailable = $false
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " GitHub PR Review Comment Publisher" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

if ($PrNumber -gt 0 -and $Repo -and $Token) {
    Write-Host "Posting review comment directly via GitHub REST API..." -ForegroundColor Yellow
    Write-Host "Target: https://github.com/$Repo/pull/$PrNumber" -ForegroundColor DarkGray

    $apiUrl = "https://api.github.com/repos/$Repo/issues/$PrNumber/comments"
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Accept"        = "application/vnd.github.v3+json"
        "User-Agent"    = "Antigravity-CodeReviewAgent"
    }
    $payload = @{
        body = $commentBody
    } | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $payload -ContentType "application/json"
        Write-Host "Successfully posted review comment to PR #$PrNumber!" -ForegroundColor Green
        Write-Host "Comment URL: $($response.html_url)" -ForegroundColor Cyan
        exit 0
    } catch {
        Write-Host "Failed to post via GitHub API: $_" -ForegroundColor Red
        Write-Host "Proceeding to save comment artifact locally." -ForegroundColor Yellow
    }
} elseif ($PrNumber -gt 0 -and $ghAvailable) {
    Write-Host "Posting review comment via GitHub CLI (gh)..." -ForegroundColor Yellow
    try {
        & gh pr comment $PrNumber --body-file $CommentFile
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully posted review comment to PR #$PrNumber via gh CLI!" -ForegroundColor Green
            exit 0
        }
    } catch {
        Write-Host "gh CLI execution failed: $_" -ForegroundColor Red
    }
}

# Fallback: Save and display artifact locally
$reviewsDir = Join-Path (Get-Location).Path "docs/reviews"
if (-not (Test-Path $reviewsDir)) {
    New-Item -ItemType Directory -Path $reviewsDir -Force | Out-Null
}

$timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$savedArtifactPath = Join-Path $reviewsDir "PR-REVIEW-$timestamp.md"
Set-Content -Path $savedArtifactPath -Value $commentBody -Encoding UTF8

Write-Host "`n[Notice] No active GitHub PR number or GITHUB_TOKEN environment variable provided." -ForegroundColor Yellow
Write-Host "Review comment artifact generated and saved to:" -ForegroundColor Green
Write-Host "  $savedArtifactPath" -ForegroundColor Cyan
Write-Host "`nTo publish automatically to GitHub in the future:" -ForegroundColor DarkGray
Write-Host "  `$env:GITHUB_TOKEN = '<your-github-token>'" -ForegroundColor DarkGray
Write-Host "  .\post-pr-comment.ps1 -CommentFile '$savedArtifactPath' -PrNumber <PR_NUMBER> -Repo '$Repo'" -ForegroundColor DarkGray

exit 0
