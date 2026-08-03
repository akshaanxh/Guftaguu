# start.ps1 — Guftaguu Spring Boot startup script
# Reads .env and launches the backend JAR

$envFile = Join-Path $PSScriptRoot ".env"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key   = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  Loaded: $key"
        }
    }
    Write-Host ""
} else {
    Write-Host "WARNING: .env file not found. Using system environment variables."
}

$jar = Get-ChildItem "$PSScriptRoot\build\libs\*.jar" | Where-Object { $_.Name -notlike "*plain*" } | Select-Object -First 1

if (-not $jar) {
    Write-Host "ERROR: No JAR found in build\libs\. Run: gradle build"
    exit 1
}

Write-Host "Starting Guftaguu Spring Boot Backend..."
Write-Host "  JAR:        $($jar.Name)"
Write-Host "  Socket.IO:  http://localhost:3001  (WebSocket)"
Write-Host "  REST API:   http://localhost:3002  (HTTP)"
Write-Host ""

java -jar $jar.FullName
