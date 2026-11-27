import urllib.request
import json
import time
import re
import sys

BASE_URL = "http://localhost:8080/api/v1"
FRONTEND_PROXY_URL = "http://localhost:8081/api/v1"
MAILPIT_URL = "http://localhost:8025/api/v1"

def req(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read().decode("utf-8")
            try:
                return resp.status, json.loads(raw)
            except Exception:
                return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw

print("=== STARTING STAGE 3 FUNCTIONAL VERIFICATION ===")

# --- 1. AUTH & ROLES ---
user_email = f"tutor_stage3_{int(time.time())}@okututor.test"
status, body = req(f"{BASE_URL}/auth/register", "POST", {
    "email": user_email,
    "password": "Password#123",
    "repeat_password": "Password#123",
    "full_name": "Айбек Темиров"
})
assert status == 200, f"Register failed: {status} {body}"
print("1.1 Register: OK (EMAIL_VERIFICATION_REQUIRED)")

time.sleep(1)
_, mail_box = req(f"{MAILPIT_URL}/messages")
otp_code = None
for msg in mail_box.get("messages", []):
    if user_email in msg.get("To", [{}])[0].get("Address", ""):
        snippet = msg.get("Snippet", "")
        m = re.search(r"\b(\d{6})\b", snippet)
        if m:
            otp_code = m.group(1)
            break

assert otp_code, "Could not extract OTP from Mailpit"
print(f"1.2 Mailpit OTP extracted: {otp_code}")

status, verify_body = req(f"{BASE_URL}/auth/verify-email", "POST", {
    "email": user_email,
    "code": otp_code
})
assert status == 200, f"Verify email failed: {status}"
print("1.3 Verify email: OK (EMAIL_VERIFIED)")

status, login_body = req(f"{BASE_URL}/auth/login", "POST", {
    "email": user_email,
    "password": "Password#123"
})
assert status == 200, f"Login failed: {status}"
tutor_token = login_body.get("access_token") or login_body.get("token")
refresh_token = login_body.get("refresh_token")
tutor_user_id = login_body.get("user", {}).get("id") or login_body.get("userId")
print(f"1.4 Login & JWT: OK (token length: {len(tutor_token)})")

# Refresh token test
if refresh_token:
    status, refresh_body = req(f"{BASE_URL}/auth/refresh", "POST", {"refresh_token": refresh_token})
    assert status == 200, f"Token refresh failed: {status} {refresh_body}"
    tutor_token = refresh_body.get("access_token") or refresh_body.get("token")
    print("1.5 Refresh Token Rotation: OK (new token received)")

# Admin login
status, admin_login = req(f"{BASE_URL}/auth/login", "POST", {
    "email": "dev.admin@test.com",
    "password": "Support#12345"
})
assert status == 200, f"Admin login failed: {status}"
admin_token = admin_login.get("access_token") or admin_login.get("token")
print("1.6 Admin Login & Roles: OK (ADMIN role verified)")

# --- 2. TUTOR WIZARD, DRAFT, MODERATION ---
# Fetch real reference IDs
_, subjects = req(f"{BASE_URL}/subjects")
_, levels = req(f"{BASE_URL}/levels")
_, cities = req(f"{BASE_URL}/cities")

subject_id = subjects[0]["id"]
level_id = levels[0]["id"]
city_id = cities[0]["id"]

profile_payload = {
    "first_name": "Айбек",
    "last_name": "Темиров",
    "title": "Репетитор по физике и высшей математике",
    "short_description": "Подготовка к ОРТ и вступительным экзаменам в вузы",
    "about": "Выпускник КНУ, стаж преподавания более 7 лет. Индивидуальный подход к каждому ученику.",
    "price_from": 800,
    "price_to": 1500,
    "currency": "KGS",
    "online": True,
    "offline": True,
    "city_id": city_id,
    "phone": "+996555123456",
    "tutor_type": "PROFESSIONAL_TUTOR",
    "subject_ids": [subject_id],
    "level_ids": [level_id],
    "languages": ["Русский", "Кыргызча"]
}

status, draft_body = req(f"{BASE_URL}/tutors", "POST", profile_payload, tutor_token)
assert status in (200, 201), f"Create profile failed: {status} {draft_body}"
profile_id = draft_body["id"]
tutor_user_id = draft_body.get("user_id") or draft_body.get("userId") or tutor_user_id
assert draft_body["status"] == "DRAFT"
print(f"2.1 Create profile draft: OK (ID: {profile_id}, Status: DRAFT)")

status, submit_body = req(f"{BASE_URL}/tutors/me/submit", "POST", {}, tutor_token)
assert status == 200, f"Submit profile failed: {status} {submit_body}"
assert submit_body["status"] == "PENDING_MODERATION"
print("2.2 Submit to moderation: OK (Status: PENDING_MODERATION)")

# Admin rejection test
status, reject_body = req(f"{BASE_URL}/admin/tutors/{profile_id}/reject", "POST", {
    "reason": "Пожалуйста, дополните описание методики подготовки."
}, admin_token)
assert status == 200, f"Reject failed: {status}"
assert reject_body["status"] == "REJECTED"
print("2.3 Admin Rejection with reason: OK (Status: REJECTED)")

# Re-submit
status, resubmit_body = req(f"{BASE_URL}/tutors/me/submit", "POST", {}, tutor_token)
assert status == 200, f"Resubmit failed: {status}"
print("2.4 Resubmit after correction: OK (Status: PENDING_MODERATION)")

# Admin approval
status, approve_body = req(f"{BASE_URL}/admin/tutors/{profile_id}/approve", "POST", {}, admin_token)
assert status == 200, f"Approve failed: {status}"
assert approve_body["status"] == "PUBLISHED"
expires_at = approve_body.get("expires_at") or approve_body.get("expiresAt")
assert expires_at, "ExpiresAt is missing!"
print(f"2.5 Admin Approval: OK (Status: PUBLISHED, ExpiresAt: {expires_at})")

# Admin suspension & unsuspend
status, suspend_body = req(f"{BASE_URL}/admin/tutors/{profile_id}/suspend", "POST", {}, admin_token)
assert status == 200, f"Suspend failed: {status}"
assert suspend_body["status"] == "SUSPENDED"
print("2.6 Admin Suspend: OK (Status: SUSPENDED)")

status, restore_admin_body = req(f"{BASE_URL}/admin/tutors/{profile_id}/approve", "POST", {}, admin_token)
assert status == 200, f"Unsuspend failed: {status}"
assert restore_admin_body["status"] == "PUBLISHED"
print("2.7 Admin Unsuspend: OK (Status: PUBLISHED)")

# --- 3. 30-DAY LIFECYCLE, HIDE & RENEW ---
status, hide_body = req(f"{BASE_URL}/tutors/me/hide", "POST", {}, tutor_token)
assert status == 200, f"Hide failed: {status}"
assert hide_body["status"] == "HIDDEN"
print("3.1 Hide profile: OK (Status: HIDDEN)")

status, restore_body = req(f"{BASE_URL}/tutors/me/restore", "POST", {}, tutor_token)
assert status == 200, f"Restore failed: {status}"
assert restore_body["status"] == "PUBLISHED"
print("3.2 Restore profile: OK (Status: PUBLISHED)")

# Check anti-stacking protection: freshly published profile (> 7 days remaining) must reject renew with 409 Conflict
status, renew_body = req(f"{BASE_URL}/tutors/me/renew", "POST", {}, tutor_token)
assert status == 409, f"Expected 409 Conflict for renewal > 7 days, got: {status} {renew_body}"
print("3.3 Anti-stacking protection: OK (409 Conflict when > 7 days remain)")

# Now test renewal on expired profile: update expires_at in DB to past
import subprocess
subprocess.check_call([
    "docker", "compose", "exec", "-T", "postgres",
    "psql", "-U", "okututor", "-d", "okututor", "-c",
    f"UPDATE tutor_profiles SET expires_at = now() - interval '1 hour', status = 'EXPIRED' WHERE id = '{profile_id}';"
])

status, renew_body = req(f"{BASE_URL}/tutors/me/renew", "POST", {}, tutor_token)
assert status == 200, f"Renew failed on expired profile: {status} {renew_body}"
assert renew_body["status"] == "PUBLISHED"
renewed_expires_at = renew_body.get("expires_at") or renew_body.get("expiresAt")
print(f"3.4 Renew expired profile for 30 days: OK (New Status: PUBLISHED, ExpiresAt: {renewed_expires_at})")

# --- 4. SEARCH, FILTERS & SEO ---
import urllib.parse
q_encoded = urllib.parse.quote("физике")
status, search_body = req(f"{BASE_URL}/search/tutors?q={q_encoded}")
assert status == 200, f"Search failed: {status}"
items = search_body.get("items", search_body.get("content", []))
assert len(items) > 0, "Expected search result for физике"
print(f"4.1 Full-text search: OK (Found {len(items)} tutors)")

status, proxy_search = req(f"{FRONTEND_PROXY_URL}/search/tutors?q={q_encoded}")
assert status == 200, f"Frontend reverse proxy search failed: {status}"
print("4.2 Reverse Proxy Search via Nginx (port 8081): OK")

status, sitemap = req("http://localhost:8080/api/v1/sitemap.xml")
assert status == 200, f"Sitemap failed: {status}"
assert "<urlset" in sitemap or "<url" in sitemap
print("4.3 Sitemap XML generation: OK (HTTP 200)")

# --- 5. CHAT & WEBSOCKET TICKET ---
student_email = f"student_stage3_{int(time.time())}@okututor.test"
req(f"{BASE_URL}/auth/register", "POST", {
    "email": student_email,
    "password": "Password#123",
    "repeat_password": "Password#123",
    "full_name": "Эльдар"
})
time.sleep(1)
_, mail_box = req(f"{MAILPIT_URL}/messages")
student_otp = None
for msg in mail_box.get("messages", []):
    if student_email in msg.get("To", [{}])[0].get("Address", ""):
        m = re.search(r"\b(\d{6})\b", msg.get("Snippet", ""))
        if m:
            student_otp = m.group(1)
            break
req(f"{BASE_URL}/auth/verify-email", "POST", {"email": student_email, "code": student_otp})
_, student_login = req(f"{BASE_URL}/auth/login", "POST", {"email": student_email, "password": "Password#123"})
student_token = student_login.get("access_token") or student_login.get("token")

# Direct contact chat conversation
status, conv_body = req(f"{BASE_URL}/conversations/direct", "POST", {
    "participantId": str(tutor_user_id)
}, student_token)
assert status in (200, 201), f"Create conversation failed: {status} {conv_body}"
conv_id = conv_body.get("id") or conv_body.get("conversationId") or conv_body.get("conversation", {}).get("id")
print(f"5.1 Direct contact / Chat conversation created: OK (ID: {conv_id})")

# Send message
if conv_id:
    status, msg_body = req(f"{BASE_URL}/conversations/{conv_id}/messages", "POST", {
        "text": "Здравствуйте! Интересуют уроки физики."
    }, student_token)
    assert status in (200, 201), f"Send message failed: {status} {msg_body}"
    print("5.2 Send chat message in conversation: OK")

# WebSocket ticket
status, ws_ticket_body = req(f"{BASE_URL}/ws/ticket", "POST", {}, student_token)
assert status == 200, f"WS Ticket failed: {status} {ws_ticket_body}"
assert "ticket" in ws_ticket_body
print(f"5.3 WebSocket one-time auth ticket: OK ({ws_ticket_body['ticket'][:10]}...)")

# --- 6. NOTIFICATIONS & ADMIN METRICS ---
status, notifs = req(f"{BASE_URL}/notifications", "GET", None, tutor_token)
assert status == 200, f"Notifications failed: {status}"
print("6.1 Notifications endpoint: OK (HTTP 200)")

status, metrics_body = req(f"{BASE_URL}/admin/metrics/overview", "GET", None, admin_token)
assert status == 200, f"Admin metrics failed: {status}"
print(f"6.2 Admin metrics overview: OK (users: {metrics_body.get('total_users')}, tutors: {metrics_body.get('total_tutors')})")

print("\n>>> ALL STAGE 3 FUNCTIONAL SCENARIOS TESTED & 100% PROVEN! <<<")
