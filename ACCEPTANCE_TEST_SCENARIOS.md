# Acceptance test scenarios — OkuTutor Marketplace MVP

Все тесты выполнять на отдельной disposable/test database с синтетическими fixtures. Никогда не создавать тестовых пользователей в production. Для каждого теста записать ID, дату, commit SHA, environment, шаги, expected/actual, command/browser evidence, status `PASSED/FAILED/BLOCKED/NOT RUN`.

## Public catalog/profile

| ID | Сценарий | Expected |
|---|---|---|
| PUB-001 | Guest opens `/` | Page renders, no console errors, CTA routes work |
| PUB-002 | Click Find tutor | `/tutors` loads real API results |
| PUB-003 | Subject filter | URL/API filter matches returned profiles |
| PUB-004 | City filter | Backend results truly filtered |
| PUB-005 | Price min/max | Validation >=0, min<=max, blank not NaN/0 |
| PUB-006 | Reset filters | Query params/state cleared, page=0 |
| PUB-007 | Pagination | Correct records/page, boundaries disabled |
| PUB-008 | No results | Empty state; no fake tutor rows |
| PUB-009 | API error | Error/retry state, no endless spinner |
| PUB-010 | Click tutor card | Opens canonical `/tutor/:slug` |
| PUB-011 | Direct refresh profile URL | SPA fallback and public API both work |
| PUB-012 | Open unpublished/suspended/blocked profile | Not publicly exposed |
| PUB-013 | Profile lacks real rating | No 4.9/127 fake values |
| PUB-014 | Inspect public JSON | No phone/email/internal moderation details |
| PUB-015 | Bad/missing avatar | Neutral fallback, no invented photo |

## Authentication

| ID | Scenario | Expected |
|---|---|---|
| AUTH-001 | Valid registration | USER created, verification flow starts |
| AUTH-002 | Invalid email/password | Client+server validation, no duplicate |
| AUTH-003 | Consent unchecked | Submit blocked |
| AUTH-004 | Wrong/expired verification code | Error; account remains unverified |
| AUTH-005 | Correct verification | Account verified |
| AUTH-006 | Login good credentials | Session established, `/auth/me` works |
| AUTH-007 | Login wrong credentials | Safe generic error, no enumeration |
| AUTH-008 | Refresh rotation | Current token valid, replay/old token follows policy |
| AUTH-009 | Logout | Session revoked, private access removed |
| AUTH-010 | Forgot/reset password | Test mail sink receives code; prior refresh sessions revoked |
| AUTH-011 | Auth return intent | Restores original profile/action exactly once |
| AUTH-012 | OAuth not configured | UI does not promise unavailable login; prod no placeholder creds |

## TutorProfile lifecycle

| ID | Scenario | Expected |
|---|---|---|
| PROF-001 | USER opens create form | Full form and real reference lists load |
| PROF-002 | Save valid draft | TutorProfile created with DRAFT |
| PROF-003 | Refresh during editing | Saved draft reloaded; no loss |
| PROF-004 | Existing profile opens wizard | Prefilled, no duplicate profile |
| PROF-005 | Invalid price/city/subject | Client/backend validation blocks save |
| PROF-006 | Select subject and level | UUIDs persisted; translated labels returned |
| PROF-007 | Avatar upload (if enabled) | Real media object, URL and permission; not filename-only |
| PROF-008 | Submit draft | PENDING_MODERATION, hidden from public list |
| PROF-009 | USER invokes approve API | 403 |
| PROF-010 | ADMIN approves | PUBLISHED; visible to public search |
| PROF-011 | ADMIN rejects without reason | Validation error |
| PROF-012 | ADMIN rejects with reason | REJECTED, owner sees real reason |
| PROF-013 | Owner fixes/re-submits | Back to PENDING_MODERATION |
| PROF-014 | ADMIN suspends | Disappears from public API/search |
| PROF-015 | ADMIN restores | Public visibility restored |
| PROF-016 | USER creates second profile | 409/no duplicate |
| PROF-017 | Blocked user edits/submits | 403 |
| PROF-018 | User A edits profile B | 403/404; no data mutation |

## Contact requests

| ID | Scenario | Expected |
|---|---|---|
| REQ-001 | Guest sends request to published profile | Saved and confirmed; no fake inbox/chat promise |
| REQ-002 | Authenticated USER sends request | Visible in sent list and owner incoming list |
| REQ-003 | Owner requests own profile | Backend rejects |
| REQ-004 | Request unpublished/blocked profile | 404/unavailable |
| REQ-005 | Empty name/contact | Validation error, no record |
| REQ-006 | Rapid authenticated double click | One active request/idempotent result |
| REQ-007 | Guest spam burst | Rate-limit 429 |
| REQ-008 | USER has own profile and sent requests | Both received and sent lists present |
| REQ-009 | Owner marks viewed | NEW→VIEWED only by owner |
| REQ-010 | Owner marks contacted | Allowed transition and refresh |
| REQ-011 | Student closes own request | CLOSED |
| REQ-012 | Student tries CONTACTED | 403 |
| REQ-013 | User A reads request B | 403/404 |
| REQ-014 | Chat creation fails after request save | Request remains success, chat failure separate |
| REQ-015 | Public API inspected | Contact data not leaked |

## Chat (only if kept)

| ID | Scenario | Expected |
|---|---|---|
| CHAT-001 | Request opens/creates conversation | One conversation linked to request |
| CHAT-002 | Participant opens conversation | Messages load; non-participant denied |
| CHAT-003 | Send valid message | Saved once, visible to both |
| CHAT-004 | Empty/oversized message | Validation; no save |
| CHAT-005 | Mark read | Only participant unread count updates |
| CHAT-006 | Mobile chat | Back to list, input/keyboard visible |
| CHAT-007 | Chat API error | Error/retry, no false sent state |
| CHAT-008 | Leave chat | Polling stops |

## Admin

| ID | Scenario | Expected |
|---|---|---|
| ADM-001 | USER opens admin | 403/redirect |
| ADM-002 | ADMIN opens tutors | Canonical TutorProfile queue, not legacy Application |
| ADM-003 | ADMIN approves | Backend updated, audit recorded, list refreshed |
| ADM-004 | ADMIN rejects with reason | Reason persists, visible to owner |
| ADM-005 | Suspend/restore | Status and public visibility correct |
| ADM-006 | ADMIN searches users | Search/filter/pagination work |
| ADM-007 | ADMIN self-block attempt | Backend prevents it |
| ADM-008 | ADMIN changes role | 403 if not SUPER_ADMIN |
| ADM-009 | SUPER_ADMIN assigns role | Only allowed roles, audit event |
| ADM-010 | Admin requests API unavailable | Error shown; no USER endpoint fallback |
| ADM-011 | Dashboard counters | Match fixture DB/API, unavailable != zero |
| ADM-012 | Support admin reply | Owner receives response; no cross-ticket access |

## Support

- Valid ticket creation.
- Invalid inputs rejected with field errors.
- User A cannot view/update User B ticket.
- Admin assignment/status/priority actions follow real enum/transitions.
- Replies persist and display to correct participants.
- Close/reopen only allowed transitions.
- Attachments, if enabled, enforce owner access and file validation.

## Security regression

- unauthenticated private endpoint → 401;
- USER on admin API → 403;
- owner/non-owner resource access;
- expired/invalid/replayed JWT/refresh token;
- blocked account cannot create/edit profile/request;
- rate limits for auth/request/chat/upload;
- XSS strings in bio/request/chat/support render safely;
- search SQLi-like input does not alter query semantics;
- public profile excludes contacts/private moderation fields;
- logs contain no tokens/password/code/phone/message bodies;
- upload uses actual MIME/file parse and size checks;
- Prometheus endpoint not publicly accessible.

## Resilience/performance smoke

- API pagination has max page size.
- Public listing avoids N+1 and excess query count.
- Search cache does not grow unbounded.
- DB unavailable/recovered yields correct health.
- Nginx SPA fallback supports deep-route refresh.
- No spinner hangs on error.
- Chat polling does not continue after route exit.

## Report format

Each row must include ID, environment, date, commit, exact commands or browser steps, actual outcome, status, evidence path. Source code inspection alone is `NOT RUN`, not PASS.
