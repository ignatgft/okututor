# OkuTutor Backend — Performance Optimization Report

**Дата:** 2026-09-18  
**База:** 5000 `PUBLISHED` резюме, 1 реплика `Tomcat 100 / Hikari 25 / Caffeine 2000 / Neon`  
**Workload:** `GET /tutors?page=0&size=10` + `GET /slice` `sleep 0.7s`  
**Цель:** `p95 <500ms`, `0% 5xx`, `8-12` реплик → `1000 RPS`

---

## 1. Network — реальная цепочка latency

**Измерено инструментально (Micrometer `okututor_tutor_list_*` + `hikaricp_*` + `http_server_requests`):**

```
request p95 3.52s (Neon 50VU) / 97ms (Local 50VU)
├─ pool acquire: 0.20s (avg 0.88s до фикса, после 0.20s)  hikaricp_connections_acquire_seconds_sum/count
├─ network connect + TLS: ~120ms (TCP 40ms + TLS 80ms, Neon pooler c-5.us-east-2)
├─ SQL execution: 2.1ms (Index Scan 15 blocks) / 5.53ms Bitmap Heap 384 blocks до Slice
├─ transfer (Neon → API): ~400ms (RTT 880ms measured via `ping ep-shy-art...pooler 840-910ms`)
├─ JPA mapping: 20ms (tutorListMappingDuration)
└─ JSON serialization: 58ms (12KB payload)
```

**Вывод:** `DB 2ms` + `mapping 20ms` = `22ms`, но `Hikari acquire 200ms` + `network 520ms` = `742ms` → `p95 3.5s` из-за queue при `Hikari 25` + `RTT 880ms` + `Tomcat 100` конкуренция.  
**Регионы:** `API` — `Hetzner EU` (предположительно `fsn1`), `Neon` — `us-east-2 AWS`, `pooler` — `transaction pooling` `prepareThreshold=0` (совместимость `Hibernate`), `Redis` — `localhost in-memory` (до `Caffeine`). `Local PG` — `172.23.0.1:5433` `RTT 0.3ms` → `p95 97ms`.

**Controlled comparison:**

| API → DB | RPS 50VU | p95 | acquire | DB exec |
|---|---|---|---|---|
| `Neon pooler` | 20.5 | 3.52s | 0.88s | 2.1ms |
| `Local PG` | 124.7 | 97ms | 0.02s | 2.1ms |
| `Nearby PG` (не тестировался) | — | — | — | — |

→ **network bottleneck**, не `DB compute`.

## 2. Database — EXPLAIN BEFORE/AFTER

**Before Page:**

```sql
SELECT ... FROM tutor_profiles WHERE status='PUBLISHED' ORDER BY published_at DESC LIMIT 10 OFFSET 0;
-- Bitmap Heap Scan 384 blocks cost 11.88 Execution 5.53ms
SELECT COUNT(*) ...; -- 2.33ms
```

**After Slice:**

```sql
SELECT ... FROM tutor_profiles WHERE status='PUBLISHED' ORDER BY published_at DESC, id DESC LIMIT 11;
-- Index Scan idx_tutor_profiles_published_at 15 blocks Execution 2.1ms
-- hasNext = rows==11, no COUNT, no OFFSET
```

**After Cursor (keyset):**

```sql
SELECT ... WHERE status='PUBLISHED' AND (published_at, id) < (:cursor) ORDER BY published_at DESC, id DESC LIMIT 11;
-- Index Scan 15 blocks 2.1ms, deterministic, no OFFSET 500→150ms, no skip
```

**Индексы:** `idx_tutor_profiles_published_at WHERE status='PUBLISHED'` + `gin_trgm` для `ILIKE` уже есть 34 шт, новых не создано — существующие покрывают `WHERE status/order/sort`.

## 3. Cache — Caffeine + Redis v2 DTO

* `TutorPageCacheDto content,page,size,totalElements` + `TutorCacheKey SHA16` `okututor:tutor:v2:{hash}` нормализован `q|filters|sort|page/size`
* `TTL publicList 60+10s search 45+8s popular 60+10s jitter` против herd
* `Caffeine maximumSize 2000 expireAfterWrite 1m ≈100MB` `enableStatistics`
* `Redis v2 DTO` `GenericJackson2JsonRedisSerializer(JavaTimeModule)` не `PageImpl`, `transactionAware` удален

|  | cold | warm | mixed 70/30 |
|---|---|---|---|
| hit % | 0% | 60% | 70% |
| miss | 100% → DB 0.45s | 40% | 30% |
| eviction | 0.1/s | 0.1/s | 0.1/s |
| loadPenalty | 12ms | 12ms | 12ms |
| DB queries saved | 0 | 60% | 70% |

**Stampede:** `100 MISS same key → 1 DB query` не реализован (простой `synchronized` single-flight планируется), `jitter` уже снижает одновременный `expiry`.

## 4. Hikari

| pool | RPS 100VU | p95 | active | pending | timeout | acquire |
|---|---|---|---|---|---|---|
| 10 | ~15 | 5s | 10 | 20 | 100 | 1.2s |
| 25 (baseline) | 23.7 Neon /233 Local | 4.34s /209ms | 8 | 0 | 0 | 0.20s |
| 40 | 24 | 4.5s | 12 | 10 | 50 | 0.40s |
| 50 | 26 | 9.8s | 20 | 79 | 5270 | 0.88s |

`25` — saturation point, `50` → `pending 79` лавина. `8×25=200 < Neon 901` запас `100` для `admin/migrations`.

## 5. Scaling — реально измерено

| replicas | RPS 100VU slice | p95 | p99 | errors | interrupted | DB conn | CPU |
|---|---|---|---|---|---|---|---|
| 1 | 23.8 | 4.04s | 5.9s | 0% | 0 | 8 | 12% |
| 2 | 32.9 | 3.42s | 5.3s | 0% | 0 | 16 | 22% | **68% линейности** |
| 4 | — | — | — | — | — | — | — | не тестировался |
| 8 | — | — | — | — | — | — | — | гипотеза |

`4/8` не считать результатом до теста. `Local 1 replica 250VU 349 RPS p95 590ms` → `4× ~800 RPS p95 <500ms` прогноз `Local`.

## 6. Security

* `JWT iss/aud/jti` `HSTS/CSP` `Cache keys SHA` без `PII`, `pageSize 50 Slice/cursor 50 Page 100` `cursor Base64 validation`, `search 60/min listing 100/min IP` `Lua INCR+PEXPIRE` атомарно `MD5 hash` для `PII`
* `actuator/prometheus` за `docker network` `permitAll` — в `prod` `ACL` `trustedProxies`
* `IDOR/BOLA` `admin hasRole` `ownership` `?pageSize=1000000 → cap 100` `?cursor=<malformed> →400`

## 7. Bottleneck NOW

**Главный:** `Network RTT 880ms` + `Neon pooler` `TCP/SSL 120ms + transfer 400ms` → `p95 3.52s Neon vs 97ms Local` `DB 2ms` не виноват.

**Доказательство:** `1 replica 50VU Neon p95 3.52s Local p95 97ms` `acquire 0.2s pending 0 DB 2ms` `EXPLAIN 2.1ms`.

**Почему bottleneck:** `880ms × 25 pool × 100 threads` → очередь `pending 79` при `500 VU` `p95 17s 377 interrupted`.

**Что перестало быть bottleneck:** `SQL` `COUNT` `OFFSET` `N+1` (batch `findByProfileIdIn`) `Hikari` (0 pending после `25`).

**Следующий шаг:** `read replica DB_REPLICA_ENABLED=true LAZY` `search/slice readOnly→replica` `<100ms lag`, `PgTutors IntersectionObserver nextCursor` infinite scroll, `rate-limit Lua`.

## 8. Capacity — verified vs estimated

* **verified 1 replica Local:** `100 VU 233 RPS p95 209ms 0%` `250 VU 349 RPS p95 590ms 0.28%` → `~150 онлайн p95 <500ms` `~280 RPS`
* **verified 1 replica Neon:** `50 VU 20 RPS p95 3.5s` → `0 онлайн p95 <500ms` на `1 строке`
* **estimated 8 replicas Local:** `8×280 ≈800 RPS p95 <500ms` `Local` `Caffeine hit 70%` → `1000 RPS` требует `12` или `Neon 8CU` + `replica`
* **estimated 10k online:** `10k ×0.1 RPS =1000 RPS` (1 req/10s) — не подтвержден `workload model` `search:resume:messages =?`

**Не выдавать `8-12 replicas =10k online` как факт до теста `1000 RPS` `4/8` реплик.**
