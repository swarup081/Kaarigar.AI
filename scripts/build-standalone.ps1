param(
  [switch]$SkipPrebuild,
  [string]$Architectures = 'arm64-v8a,armeabi-v7a'
)
$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
$mobilePath = Join-Path $repoPath 'apps/mobile'
$outputPath = Join-Path $repoPath 'artifacts'
$previousEnvironment = @{}
$publicNames = @(Get-ChildItem Env: | Where-Object Name -Like 'EXPO_PUBLIC_*' | Select-Object -ExpandProperty Name)
$environmentNames = @('EXPO_NO_DOTENV', 'NODE_ENV') + $publicNames
foreach ($name in $environmentNames) { $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
  # The shared APK starts unconfigured. Never inherit a laptop address or API credentials.
  foreach ($name in $publicNames) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
  $env:EXPO_NO_DOTENV = '1'
  $env:NODE_ENV = 'production'
  Push-Location $mobilePath
  try {
    if (!$SkipPrebuild) {
      & pnpm.cmd exec expo prebuild --platform android --no-install
      if ($LASTEXITCODE -ne 0) { throw 'Android prebuild failed.' }
    }
    Push-Location (Join-Path $mobilePath 'android')
    try {
      & ./gradlew.bat assembleRelease "-PreactNativeArchitectures=$Architectures" --console=plain
      if ($LASTEXITCODE -ne 0) { throw 'Android release build failed.' }
    } finally { Pop-Location }
  } finally { Pop-Location }
  New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
  $apkPath = Join-Path $outputPath 'Kaarigar-standalone.apk'
  Copy-Item -LiteralPath (Join-Path $mobilePath 'android/app/build/outputs/apk/release/app-release.apk') -Destination $apkPath -Force
  $hash = (Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash.ToLower()
  "$hash  Kaarigar-standalone.apk" | Set-Content -LiteralPath (Join-Path $outputPath 'Kaarigar-standalone.sha256')
  Write-Output "Standalone APK: $apkPath"
} finally {
  foreach ($name in $environmentNames) { [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], 'Process') }
}
