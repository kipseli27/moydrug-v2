# Создаёт placeholder PNG-иконки для Expo
# Запусти: .\create-assets.ps1

Add-Type -AssemblyName System.Drawing

$assetsDir = Join-Path $PSScriptRoot "assets"
if (-not (Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir | Out-Null }

function New-PlaceholderPng {
    param([string]$path, [int]$width, [int]$height, [string]$hex = "#6C63FF")

    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $color = [System.Drawing.ColorTranslator]::FromHtml($hex)
    $g.Clear($color)

    # Текст по центру
    $font  = New-Object System.Drawing.Font("Arial", [Math]::Max(12, $width/8))
    $brush = [System.Drawing.Brushes]::White
    $name  = [System.IO.Path]::GetFileNameWithoutExtension($path)
    $size  = $g.MeasureString($name, $font)
    $g.DrawString($name, $font, $brush,
        ($width  - $size.Width)  / 2,
        ($height - $size.Height) / 2)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Host "Created: $path" -ForegroundColor Green
}

New-PlaceholderPng "$assetsDir\icon.png"          1024 1024 "#6C63FF"
New-PlaceholderPng "$assetsDir\adaptive-icon.png"  1024 1024 "#6C63FF"
New-PlaceholderPng "$assetsDir\splash.png"         1242 2688 "#0F0F1A"
New-PlaceholderPng "$assetsDir\favicon.png"          48   48 "#6C63FF"

Write-Host ""
Write-Host "Assets готовы! Запускай: npx expo start" -ForegroundColor Cyan
