param(
  [string]$Mode = "full"
)
Write-Host "=== Okututor Security Audit ===" -ForegroundColor Cyan
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$reportDir = Join-Path $root "reports/security"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$reportFile = Join-Path $reportDir "audit-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
Write-Host "Report: $reportFile"

function Log($msg) { 
  Write-Host $msg
  $msg | Out-File -Append -FilePath $reportFile
}

Log "Date: $(Get-Date -Format o)"
Log "Mode: $Mode"
Log ""

# 1. Frontend npm audit
Log "=== 1. Frontend npm audit ==="
try {
  $audit = & npm --prefix frontend audit --json 2>&1 | Out-String
  $audit | Out-File -Append -FilePath $reportFile
  $obj = $audit | ConvertFrom-Json -ErrorAction SilentlyContinue
  if ($obj -and $obj.metadata) {
    Log "Vulnerabilities: $($obj.metadata.vulnerabilities | ConvertTo-Json -Compress)"
  } else {
    Log "npm audit raw output (first 500 chars): $($audit.Substring(0,[Math]::Min(500,$audit.Length)))"
  }
} catch { Log "npm audit failed: $_" }
Log ""

# 2. Backend dependency check (OWASP) - try if network available else versions
Log "=== 2. Backend dependency updates ==="
try {
  # Use versions plugin to list outdated deps (lightweight)
  $verOut = & mvn -f backend/pom.xml versions:display-dependency-updates -DoutputFile="$reportDir/versions.txt" 2>&1 | Out-String
  Log $verOut.Substring(0,[Math]::Min(3000,$verOut.Length))
  if (Test-Path "$reportDir/versions.txt") { Get-Content "$reportDir/versions.txt" -Raw | Out-File -Append -FilePath $reportFile }
} catch { Log "mvn versions failed: $_" }
Log ""

# 3. Secrets scan via gitleaks docker (if docker available)
Log "=== 3. Secrets scan (gitleaks) ==="
try {
  $hasDocker = Get-Command docker -ErrorAction SilentlyContinue
  if ($hasDocker) {
    $gitleaksOut = & docker run --rm -v "${root}:/path" zricethezav/gitleaks:latest detect --source="/path" --no-git --verbose 2>&1 | Out-String
    Log $gitleaksOut.Substring(0,[Math]::Min(4000,$gitleaksOut.Length))
  } else {
    Log "Docker not available, fallback to grep"
  }
} catch { Log "gitleaks failed: $_ (try fallback grep)" 
  # fallback grep
  $patterns = @("password\s*=\s*[`'\""]\w{8,}", "secret\s*=\s*[`'\""]", "BEGIN PRIVATE KEY", "AKIA[0-9A-Z]{16}", "ghp_[A-Za-z0-9_]{36}")
  foreach ($pat in $patterns) {
    $hits = Select-String -Path "backend/src/**/*","frontend/src/**/*" -Pattern $pat -CaseSensitive:$false 2>&1 | Select-Object -First 5
    if ($hits) { Log "Pattern $pat hits:"; $hits | ForEach-Object { Log $_.ToString() } }
  }
}
Log ""

# 4. SAST simple grep for dangerous patterns
Log "=== 4. SAST grep (XSS, SQLi, hardcoded) ==="
$checks = @(
  @{pat="dangerouslySetInnerHTML"; desc="React XSS via dangerouslySetInnerHTML"},
  @{pat="innerHTML\s*="; desc="DOM XSS via innerHTML"},
  @{pat="Statement\s+.*executeQuery\s*\("; desc="Possible SQLi via Statement"},
  @{pat="\.query\s*\(\s*['`\""]\s*\+"; desc="Possible SQLi via string concat"},
  @{pat="password\s*=\s*['`\""][^'`\""]{3,}['`\""]"; desc="Hardcoded password"},
  @{pat="secret\s*=\s*['`\""][^'`\""]{5,}['`\""]"; desc="Hardcoded secret"},
  @{pat="console\.log.*password|console\.log.*secret"; desc="Logging secrets"}
)
foreach ($c in $checks) {
  $hits = Select-String -Path "backend/src/**/*.java","frontend/src/**/*.{ts,tsx,js}" -Pattern $c.pat -ErrorAction SilentlyContinue | Select-Object -First 3
  if ($hits) {
    Log "Check $($c.desc) PAT=$($c.pat) FOUND:"
    $hits | ForEach-Object { Log "  $($_.Path):$($_.LineNumber): $($_.Line.Trim().Substring(0,[Math]::Min(120,$_.Line.Trim().Length)))" }
  } else {
    Log "Check $($c.desc) OK"
  }
}
Log ""

# 5. Trivy FS scan via docker
Log "=== 5. Trivy FS scan (if docker) ==="
try {
  $hasDocker = Get-Command docker -ErrorAction SilentlyContinue
  if ($hasDocker) {
    $trivyOut = & docker run --rm -v "${root}:/project" aquasec/trivy:latest fs --severity HIGH,CRITICAL --ignore-unfixed --format table /project 2>&1 | Out-String
    Log $trivyOut.Substring(0,[Math]::Min(8000,$trivyOut.Length))
  } else {
    Log "Docker not available for trivy"
  }
} catch { Log "trivy failed: $_" }
Log ""

# 6. Backend SpotBugs/PMD if configured
Log "=== 6. Backend SpotBugs (if plugin configured) ==="
try {
  $sb = & mvn -f backend/pom.xml spotbugs:check -o 2>&1 | Out-String
  Log $sb.Substring(0,[Math]::Min(2000,$sb.Length))
} catch { Log "spotbugs not configured, skipped" }
Log ""

Log "=== Audit Complete ==="
Write-Host "Report saved to $reportFile" -ForegroundColor Green
Get-Content $reportFile | Select-Object -Last 50
