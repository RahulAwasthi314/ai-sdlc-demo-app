#!/usr/bin/env pwsh
# Create and switch to git feature branch for the active specification
[CmdletBinding()]
param(
    [switch]$Json,
    [string]$BranchName,
    [string]$FeatureDir
)

$ErrorActionPreference = 'Stop'

# Load common specify functions
. "$PSScriptRoot/common.ps1"
$repoRoot = Get-RepoRoot
Set-Location $repoRoot

# Resolve Feature Directory and Branch Name
if (-not $FeatureDir) {
    $featureJsonPath = Join-Path $repoRoot ".specify/feature.json"
    if (Test-Path $featureJsonPath) {
        $featureJson = Get-Content $featureJsonPath -Raw | ConvertFrom-Json
        $FeatureDir = $featureJson.feature_directory
    }
}

if (-not $BranchName -and $FeatureDir) {
    $BranchName = Split-Path $FeatureDir -Leaf
}

if (-not $BranchName) {
    Write-Error "Could not determine feature branch name from feature.json or parameters."
    exit 1
}

# Extract feature number (e.g., 002 from 002-approval-limits-by-role)
$featureNum = if ($BranchName -match '^(\d+)-') { $matches[1] } else { "" }

$currentBranch = (git branch --show-current 2>$null).Trim()

if ($currentBranch -ne $BranchName) {
    # Check if branch already exists
    $existingBranch = git branch --list $BranchName
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        if ($existingBranch) {
            & git checkout -q $BranchName 2>$null
        } else {
            & git checkout -q -b $BranchName 2>$null
        }
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

$activeBranch = (git branch --show-current 2>$null).Trim()

if ($Json) {
    [PSCustomObject]@{
        BRANCH_NAME = $activeBranch
        FEATURE_NUM = $featureNum
        STATUS = if ($activeBranch -eq $BranchName) { "ACTIVE" } else { "FAILED" }
    } | ConvertTo-Json -Compress
} else {
    Write-Host "Switched to feature branch: $activeBranch" -ForegroundColor Green
}
