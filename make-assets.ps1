# Создаёт PNG ассеты без System.Drawing — через base64
# Запусти: .\make-assets.ps1

$assetsDir = Join-Path $PSScriptRoot "assets"
if (-not (Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir | Out-Null }

# Фиолетовый 64x64 PNG (#6C63FF)
$purple = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAATklEQVR42u3PMQ0AAAgDsHnlxf8LErhJmtRA0zWvRUBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEDgstM14aVI6OVAAAAAAElFTkSuQmCC"

# Тёмный 64x64 PNG (#0F0F1A)
$dark = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAATklEQVR42u3PMQ0AAAgDsDnYj3+hSOAmaVIDTTuvRUBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEDgsnMMgC6okLMcAAAAAElFTkSuQmCC"

function Write-Png($name, $b64) {
    $path = Join-Path $assetsDir $name
    [System.IO.File]::WriteAllBytes($path, [Convert]::FromBase64String($b64))
    Write-Host "Created: $path" -ForegroundColor Green
}

Write-Png "icon.png"          $purple
Write-Png "adaptive-icon.png" $purple
Write-Png "splash.png"        $dark
Write-Png "favicon.png"       $purple

Write-Host ""
Write-Host "Assets готовы!" -ForegroundColor Cyan
