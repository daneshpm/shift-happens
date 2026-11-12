# Builds dist/shift-happens.zip for itch.io (index.html at the zip root)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null
$zip = Join-Path $dist 'shift-happens.zip'
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $root 'index.html'), (Join-Path $root 'game.js') -DestinationPath $zip
$kb = [math]::Round((Get-Item $zip).Length / 1KB, 1)
Write-Host "Built $zip ($kb KB)"
