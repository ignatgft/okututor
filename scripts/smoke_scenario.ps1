$ErrorActionPreference = "Stop"

Write-Host "=== 1. REGISTRATION ==="
$rand = Get-Random -Minimum 1000 -Maximum 9999
$email = "tutor.smoke$rand@test.kg"
$password = "Password1234!"
$regBody = @{
    email = $email
    password = $password
    repeat_password = $password
    full_name = "Айбек Садыков"
    termsAccepted = $true
    privacyAccepted = $true
} | ConvertTo-Json

$regResp = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/register" -Method Post -Body $regBody -ContentType "application/json"
Write-Host "Register status: $($regResp.status)"

Start-Sleep -Seconds 1

Write-Host "=== 2. GET VERIFICATION CODE FROM MAILPIT ==="
$msg = $null
for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 500
    $messages = Invoke-RestMethod -Uri "http://localhost:8025/api/v1/messages"
    $msg = $messages.messages | Where-Object { $_.To[0].Address -eq $email } | Select-Object -First 1
    if ($msg) { break }
}
if (-not $msg) {
    throw "Verification email not found in Mailpit for $email"
}
$codeMatch = [regex]::Match($msg.Subject, "\b\d{6}\b")
if (-not $codeMatch.Success) {
    $codeMatch = [regex]::Match($msg.Snippet, "\b\d{6}\b")
}
if (-not $codeMatch.Success) {
    throw "Could not extract 6-digit code from email: $($msg.Subject) / $($msg.Snippet)"
}
$code = $codeMatch.Value
Write-Host "Extracted verification code: $code"

Write-Host "=== 3. VERIFY EMAIL ==="
$verifyBody = @{
    email = $email
    code = $code
} | ConvertTo-Json
$verifyResp = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/verify-email" -Method Post -Body $verifyBody -ContentType "application/json"
Write-Host "Email verified! Status: $($verifyResp.status)"

Write-Host "=== 4. LOGIN TUTOR ==="
$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
if ($loginResp.status -eq "EMAIL_NOT_VERIFIED") {
    throw "Login failed: Email was not marked verified!"
}
$tutorToken = $loginResp.access_token
Write-Host "Tutor logged in, JWT length: $($tutorToken.Length)"

Write-Host "=== 5. CREATE TUTOR PROFILE ==="
$subjects = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/subjects"
$cities = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/cities"
$subjId = $subjects[0].id
$cityId = $cities[0].id

$profileBody = @{
    first_name = "Айбек"
    last_name = "Садыков"
    title = "Репетитор по математике"
    about = "Опытный преподаватель математики и геометрии с 7-летним стажем."
    education = "КНУ им. Ж. Баласагына, механико-математический факультет"
    experience_years = 7
    price_from = 800
    price_to = 1200
    currency = "KGS"
    online = $true
    offline = $true
    city_id = $cityId
    subject_ids = @($subjId)
    languages = @("RU", "KY")
} | ConvertTo-Json

$headers = @{ Authorization = "Bearer $tutorToken" }
try {
    $createdProfile = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/tutor-profiles" -Method Post -Body $profileBody -Headers $headers -ContentType "application/json"
} catch {
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "422 Error Body: $($reader.ReadToEnd())"
    }
    throw $_
}
Write-Host "Profile created! ID: $($createdProfile.id), Status: $($createdProfile.status)"
if ($createdProfile.status -ne "DRAFT") {
    throw "Expected DRAFT status but got $($createdProfile.status)"
}

Write-Host "=== 6. SUBMIT FOR MODERATION ==="
$submittedProfile = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/tutor-profiles/me/submit" -Method Post -Headers $headers
Write-Host "Profile submitted! Status: $($submittedProfile.status)"
if ($submittedProfile.status -ne "PENDING_MODERATION") {
    throw "Expected PENDING_MODERATION status but got $($submittedProfile.status)"
}

Write-Host "=== 7. LOGIN ADMIN ==="
$adminLoginBody = @{
    email = "dev.admin@test.com"
    password = "Support#12345"
} | ConvertTo-Json
$adminLoginResp = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method Post -Body $adminLoginBody -ContentType "application/json"
$adminToken = $adminLoginResp.access_token
Write-Host "Admin logged in, JWT length: $($adminToken.Length)"

Write-Host "=== 8. APPROVE PROFILE AS ADMIN ==="
$adminHeaders = @{ Authorization = "Bearer $adminToken" }
$approvedProfile = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/tutor-profiles/$($createdProfile.id)/approve" -Method Post -Headers $adminHeaders
$exp = if ($approvedProfile.expires_at) { $approvedProfile.expires_at } else { $approvedProfile.expiresAt }
Write-Host "Profile approved! Status: $($approvedProfile.status), ExpiresAt: $exp"
if ($approvedProfile.status -ne "PUBLISHED") {
    throw "Expected PUBLISHED status but got $($approvedProfile.status)"
}

Write-Host "=== 9. SEARCH TUTORS (DIRECT & FRONTEND PROXY) ==="
# Test direct backend search
$searchResp = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/search/tutors?query=Садыков"
Write-Host "Search direct count: $($searchResp.total_elements)"
$found = $searchResp.content | Where-Object { $_.id -eq $createdProfile.id }
if (-not $found) {
    throw "Approved profile $($createdProfile.id) not found in direct search!"
}
$fn = if ($found.first_name) { "$($found.first_name) $($found.last_name)" } else { "$($found.firstName) $($found.lastName)" }
Write-Host "Verified profile in direct search: $($found.title) by $fn"

# Test frontend reverse proxy (/api -> backend)
$frontSearch = Invoke-RestMethod -Uri "http://localhost:8081/api/v1/search/tutors?query=Садыков"
Write-Host "Search frontend proxy count: $($frontSearch.total_elements)"
$foundFront = $frontSearch.content | Where-Object { $_.id -eq $createdProfile.id }
if (-not $foundFront) {
    throw "Approved profile $($createdProfile.id) not found via frontend proxy!"
}
Write-Host "Verified profile via frontend proxy: $($foundFront.title)"

Write-Host "=== 10. ADMIN METRICS OVERVIEW ==="
$metrics = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/metrics/overview" -Headers $adminHeaders
Write-Host "Total users: $($metrics.total_users)"
Write-Host "Total tutors: $($metrics.total_tutors)"
Write-Host "Active tutor profiles: $($metrics.active_tutor_profiles)"

Write-Host "`n>>> ALL 10 SMOKE TEST STAGES PASSED SUCCESSFULLY! 100% PROVEN! <<<"
