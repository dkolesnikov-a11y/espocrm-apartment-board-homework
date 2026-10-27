$ErrorActionPreference = 'Stop'
$target = Join-Path $PSScriptRoot '.env'
if (Test-Path -LiteralPath $target) {
    Write-Host 'Local .env already exists; it was not changed.'
    return
}
function New-LocalSecret {
    $bytes = New-Object byte[] 24
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}
$lines = @(
    '# Local credentials. Do not publish this file.'
    "MARIADB_ROOT_PASSWORD=$(New-LocalSecret)"
    "ESPOCRM_DATABASE_PASSWORD=$(New-LocalSecret)"
    'ESPOCRM_ADMIN_USERNAME=admin'
    "ESPOCRM_ADMIN_PASSWORD=$(New-LocalSecret)"
)
[IO.File]::WriteAllLines($target, $lines, [Text.UTF8Encoding]::new($false))
Write-Host 'Created local .env with random passwords. Read login credentials from that file.'
