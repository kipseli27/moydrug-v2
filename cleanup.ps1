# Скрипт очистки устаревших файлов moydrug-v2
# Запусти из папки D:\filos\moydrug-v2:  .\cleanup.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Удаляю устаревшие папки и файлы..." -ForegroundColor Yellow

# Старые группы (до Expo Router) — заменены (auth) и (tabs)
Remove-Item -Path "$root\app\_auth" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$root\app\_tabs" -Recurse -Force -ErrorAction SilentlyContinue

# Стартовый App.js (до expo-router/entry)
Remove-Item -Path "$root\app\App.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$root\App.js"    -Force -ErrorAction SilentlyContinue

Write-Host "Готово." -ForegroundColor Green
Write-Host ""
Write-Host "Структура app/ после очистки:"
Get-ChildItem "$root\app" -Recurse | Where-Object { !$_.PSIsContainer } | Select-Object -ExpandProperty FullName
