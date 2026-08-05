# Trusts the local H2Ohhh dev code-signing certificate in the current user's
# certificate stores (Root + TrustedPublisher).
#
# Needed because this Windows PC has Application Control (Smart App Control)
# enabled, which blocks unsigned executables. After the cert is trusted here,
# the signed H2Ohhh.exe / installer produced by `npm run build:installer` is
# allowed to run on this machine.
#
# Usage (run in a normal PowerShell window, NOT elevated):
#   npm run trust:cert
#   -or-
#   powershell -ExecutionPolicy Bypass -File scripts\trust-dev-cert.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security

$projectRoot = Split-Path -Parent $PSScriptRoot
$pfxPath = Join-Path $projectRoot 'build\codesign-dev.pfx'
$pfxPassword = 'h2ohhh-dev-sign'

if (-not (Test-Path $pfxPath)) {
  Write-Error "Certificate file not found: $pfxPath"
  exit 1
}

$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2(
  $pfxPath,
  $pfxPassword,
  [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::DefaultKeySet)

function Import-Cert([string]$storeName) {
  $store = New-Object System.Security.Cryptography.X509Certificates.X509Store($storeName, 'CurrentUser')
  $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
  try {
    $existing = $store.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
    if ($existing) {
      Write-Output "  already present in $storeName (thumbprint $($cert.Thumbprint))"
    } else {
      $store.Add($cert)
      Write-Output "  imported into $storeName (thumbprint $($cert.Thumbprint))"
    }
  } finally {
    $store.Close()
  }
}

Write-Output 'Trusting H2Ohhh dev code-signing certificate...'
Import-Cert 'Root'
Import-Cert 'TrustedPublisher'
Write-Output 'Done. You can now run:  npm run build:installer'
Write-Output '(If the app still refuses to start, your Application Control policy may need the app allowed manually.)'
