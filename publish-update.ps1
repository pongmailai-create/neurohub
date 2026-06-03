# NeuroHub one-click update publisher.
# Builds the installer, updates latest.json, pushes to GitHub and creates a Release.
# Requirements (one-time): git + GitHub CLI (gh) installed and `gh auth login` done,
# and a GitHub remote set: `git remote add origin https://github.com/USER/REPO.git`.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location -Path $PSScriptRoot

function Fail($msg) { Write-Host "`n[ERROR] $msg" -ForegroundColor Red; Read-Host 'Press Enter to exit'; exit 1 }

# --- tools check ---
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'git not found. Install Git.' }
if (-not (Get-Command gh  -ErrorAction SilentlyContinue)) { Fail 'GitHub CLI (gh) not found. Install from https://cli.github.com and run: gh auth login' }

# --- version from package.json ---
$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$version = $pkg.version
Write-Host "Version: $version" -ForegroundColor Cyan

# --- repo from git remote ---
try { $origin = (git remote get-url origin).Trim() } catch { Fail 'No git remote "origin". Run: git remote add origin https://github.com/USER/REPO.git' }
if ($origin -match 'github\.com[:/]+([^/]+)/(.+?)(\.git)?$') { $user = $Matches[1]; $repo = $Matches[2] }
else { Fail "Cannot parse GitHub repo from origin: $origin" }
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if (-not $branch -or $branch -eq 'HEAD') { $branch = 'main' }
Write-Host "Repo: $user/$repo  (branch $branch)" -ForegroundColor Cyan

# --- release notes (optional notes.txt, else default) ---
$notes = if (Test-Path notes.txt) { (Get-Content notes.txt -Raw) } else { "NeuroHub v$version" }

# --- make sure the app checks THIS repo's manifest, then build ---
$rawUrl = "https://raw.githubusercontent.com/$user/$repo/$branch/latest.json"
$constants = 'shared/constants.ts'
$c = Get-Content $constants -Raw
$c = [regex]::Replace($c, "export const UPDATE_MANIFEST_URL\s*=\s*'[^']*';", "export const UPDATE_MANIFEST_URL =`n  '$rawUrl';")
Set-Content $constants -Value $c -Encoding UTF8 -NoNewline

Write-Host "`nBuilding installer..." -ForegroundColor Yellow
cmd /c "npm run build" ; if ($LASTEXITCODE -ne 0) { Fail 'build failed' }
cmd /c "npx electron-builder --win nsis" ; if ($LASTEXITCODE -ne 0) { Fail 'electron-builder failed' }

$setup = "release/NeuroHub Setup $version.exe"
if (-not (Test-Path $setup)) { Fail "Installer not found: $setup" }

# --- GitHub asset filename (GitHub replaces spaces with dots) ---
$assetName = "NeuroHub.Setup.$version.exe"
$downloadUrl = "https://github.com/$user/$repo/releases/download/v$version/$assetName"

# --- write latest.json ---
$manifest = [ordered]@{ version = $version; url = $downloadUrl; notes = $notes }
($manifest | ConvertTo-Json) | Set-Content latest.json -Encoding UTF8
Write-Host "latest.json -> $downloadUrl" -ForegroundColor Cyan

# --- commit & push ---
git add latest.json shared/constants.ts package.json
git commit -m "release v$version" 2>$null | Out-Null
git push origin $branch ; if ($LASTEXITCODE -ne 0) { Fail 'git push failed' }

# --- create or update GitHub Release ---
$exists = $false
gh release view "v$version" 1>$null 2>$null ; if ($LASTEXITCODE -eq 0) { $exists = $true }
if ($exists) {
  gh release upload "v$version" "$setup" --clobber ; if ($LASTEXITCODE -ne 0) { Fail 'gh release upload failed' }
} else {
  gh release create "v$version" "$setup" --title "v$version" --notes "$notes" ; if ($LASTEXITCODE -ne 0) { Fail 'gh release create failed' }
}

Write-Host "`n=== DONE. Update v$version is published. Friends will get the banner. ===" -ForegroundColor Green
Read-Host 'Press Enter to exit'
