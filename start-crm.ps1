param([switch]$Demo)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (!(Test-Path -LiteralPath '.env')) { & (Join-Path $PSScriptRoot 'init-env.ps1') }
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) { $dockerExe = $docker.Source }
else { $dockerExe = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' }
if (!(Test-Path -LiteralPath $dockerExe)) { throw 'Install Docker Desktop first.' }
function Invoke-Docker {
    & $dockerExe @args
    if ($LASTEXITCODE -ne 0) { throw "Docker failed: $args" }
}
Invoke-Docker compose --progress plain up -d
$ready = $false
for ($attempt = 0; $attempt -lt 120; $attempt++) {
    $installed = & $dockerExe compose exec -T espocrm bin/command config:get isInstalled 2>$null
    if ($LASTEXITCODE -eq 0 -and ($installed -join '').Trim() -eq 'true') { $ready = $true; break }
    Start-Sleep -Seconds 5
}
if (!$ready) { throw 'CRM installation timed out. Check: docker compose logs espocrm' }
Invoke-Docker compose cp ./extension/custom/. espocrm:/var/www/html/custom/
Invoke-Docker compose cp ./extension/client/custom/. espocrm:/var/www/html/client/custom/
Invoke-Docker compose cp ./scripts/setup.php espocrm:/tmp/apartment-setup.php
Invoke-Docker compose exec -T --user root espocrm chown -R www-data:www-data custom client/custom
Invoke-Docker compose exec -T --user www-data espocrm php rebuild.php
if ($Demo) { Invoke-Docker compose exec -T --user www-data espocrm php /tmp/apartment-setup.php --demo }
else { Invoke-Docker compose exec -T --user www-data espocrm php /tmp/apartment-setup.php }
Invoke-Docker compose exec -T --user www-data espocrm php clear_cache.php
Write-Host 'CRM ready: http://localhost:8080/#Apartment'
