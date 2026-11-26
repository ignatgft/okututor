# OkuTutor — REST API Reference (v1)

Базовый URL: `http://localhost:8080/api/v1` (локально) / `https://api.okututor.com/api/v1` (продакшен).  
Все ответы возвращаются в формате `application/json;charset=UTF-8`.

---

## 1. Аутентификация и токены (`/api/v1/auth`)

### 1.1 Регистрация
- **POST** `/auth/register`
- **Тело запроса:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password#123",
    "full_name": "Иван Иванов"
  }
  ```
- **Ответ 200 OK:**
  ```json
  {
    "status": "EMAIL_VERIFICATION_REQUIRED",
    "email": "user@example.com"
  }
  ```

### 1.2 Подтверждение Email
- **POST** `/auth/verify-email`
- **Тело запроса:**
  ```json
  {
    "email": "user@example.com",
    "code": "123456"
  }
  ```
- **Ответ 200 OK:**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "dGhpcy1pcy1...",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Иван Иванов",
      "role": "USER"
    }
  }
  ```

### 1.3 Вход
- **POST** `/auth/login`
- **Тело запроса:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password#123"
  }
  ```
- **Ответ 200 OK:** JWT Access Token (15 мин) + Refresh Token в HTTP-only cookie или JSON.

### 1.4 Обновление токена (Refresh Token Rotation)
- **POST** `/auth/refresh`
- **Заголовок / Cookie:** `RefreshToken: <token>`
- **Ответ 200 OK:** Новая пара токенов с инвалидацией старого в Redis.

### 1.5 Выход
- **POST** `/auth/logout`
- **Заголовок:** `Authorization: Bearer <access_token>`
- **Ответ 204 No Content:** Токен отзывается в Redis.

---

## 2. Профили и резюме репетиторов (`/api/v1/tutors`)

### 2.1 Текущее резюме пользователя
- **GET** `/tutors/me`
- **Заголовок:** `Authorization: Bearer <access_token>`
- **Ответ 200 OK:** Данные профиля/резюме или `404 Not Found` (если черновик не создан).

### 2.2 Сохранение черновика / обновление
- **PUT** `/tutors/me`
- **Тело запроса:**
  ```json
  {
    "full_name": "Айбек Садыков",
    "city": "Бишкек",
    "subjects": ["Математика", "Физика"],
    "bio": "Опытный преподаватель, подготовка к ОРТ.",
    "hourly_rate": 800,
    "format": "ONLINE_OFFLINE",
    "tutor_type": "PROFESSIONAL",
    "experience_years": 5
  }
  ```
- **Ответ 200 OK:** Обновленный `TutorProfileResponse`.

### 2.3 Отправка на модерацию
- **POST** `/tutors/me/submit`
- **Ответ 200 OK:** Статус профиля переходит в `PENDING_MODERATION`.

### 2.4 Скрытие из поиска владельцем
- **POST** `/tutors/me/hide`
- **Ответ 200 OK:** Статус переходит в `HIDDEN`, профиль мгновенно скрывается из выдачи.

### 2.5 Восстановление видимости
- **POST** `/tutors/me/restore`
- **Ответ 200 OK:** Возвращается статус `PUBLISHED` (если `expiresAt > now`) или `DRAFT`.

### 2.6 Продление публикации (+30 дней)
- **POST** `/tutors/me/renew`
- **Правило:** `expiresAt = max(now, expiresAt) + 30 дней`, защита от мульти-стекинга (не чаще 1 раза при сроке > 7 дней).
- **Ответ 200 OK:** Обновленный `expiresAt`.

### 2.7 Публичный профиль репетитора
- **GET** `/tutors/{id}`
- **Ответ 200 OK:** Публичные поля репетитора (доступно только если статус `PUBLISHED` и `expiresAt > now`). При просрочке — `404 Not Found` (или заглушка 200 с noindex в SEO-роутере).

---

## 3. Каталог и поиск (`/api/v1/tutors`, `/api/v1/search`)

### 3.1 Поиск с фильтрами
- **GET** `/tutors?subject=Математика&city=Бишкек&format=online&price_min=500&price_max=1500&page=0&size=20`
- **Гарантия Free MVP:** В SQL-запросе строго действует условие `expires_at > current_timestamp` и `status = 'PUBLISHED'`.
- **Ответ 200 OK:**
  ```json
  {
    "content": [
      {
        "id": "uuid",
        "full_name": "Айбек С.",
        "city": "Бишкек",
        "subjects": ["Математика"],
        "hourly_rate": 800,
        "format": "ONLINE",
        "rating": 5.0,
        "reviews_count": 12,
        "avatar_url": "/api/v1/media/..."
      }
    ],
    "page": 0,
    "size": 20,
    "total_elements": 42,
    "total_pages": 3
  }
  ```

### 3.2 Автодополнение
- **GET** `/search/autocomplete?q=мат`
- **Ответ 200 OK:**
  ```json
  {
    "subjects": ["Математика", "Высшая математика"],
    "cities": ["Бишкек"]
  }
  ```

---

## 4. Чат и обращения (`/api/v1/chat`, `/ws/chat`)

### 4.1 Список диалогов
- **GET** `/chat/conversations`
- **Ответ 200 OK:** Массив бесед с последним сообщением и счетчиком непрочитанных.

### 4.2 Сообщения беседы
- **GET** `/chat/conversations/{id}/messages?page=0&size=50`
- **Ответ 200 OK:** История сообщений.

### 4.3 Отправка сообщения (REST fallback)
- **POST** `/chat/conversations/{id}/messages`
- **Тело:** `{"content": "Здравствуйте, хочу записаться на урок."}`

### 4.4 WebSocket одноразовый тикет
- **POST** `/chat/ws-ticket`
- **Ответ 200 OK:** `{"ticket": "uuid", "expires_in": 60}`
- **Подключение к STOMP:** `/ws/chat?ticket=<ticket>`

---

## 5. Правовые документы и согласия (`/api/v1/legal`, `/api/v1/consent`, `/api/v1/cookies`)

### 5.1 Публичные документы
- **GET** `/legal/documents/{type}/published?lang=ru`
  - `type`: `TERMS_OF_SERVICE`, `PRIVACY_POLICY`, `COOKIE_POLICY`, `TUTOR_AGREEMENT`.
- **Ответ 200 OK:** Версия документа, дата вступления в силу, HTML/Markdown содержимое.

### 5.2 Фиксация согласия пользователя
- **POST** `/consent`
- **Тело:**
  ```json
  {
    "document_id": "uuid",
    "document_version_id": "uuid",
    "consent_type": "REGISTRATION_TERMS",
    "ip_address": "127.0.0.1",
    "user_agent": "Mozilla/5.0..."
  }
  ```

### 5.3 Категории Cookies
- **GET** `/cookies/categories`
- **Ответ 200 OK:** Список необходимых, аналитических и функциональных cookie.

---

## 6. Панель администратора (`/api/v1/admin`)
Доступ только с ролями `ADMIN`, `SUPER_ADMIN`.

### 6.1 Метрики резюме
- **GET** `/admin/tutors/metrics`
- **Ответ 200 OK:**
  ```json
  {
    "active": 34,
    "expiring": 6,
    "expired": 12,
    "pending_moderation": 3,
    "rejected": 2,
    "hidden": 4
  }
  ```

### 6.2 Модерация резюме
- **POST** `/admin/tutors/{id}/approve` — публикует на 30 дней (`expiresAt = now + 30d`).
- **POST** `/admin/tutors/{id}/reject` — отклоняет с причиной: `{"reason": "Некорректное фото"}`.
- **POST** `/admin/tutors/{id}/suspend` — блокирует профиль.

### 6.3 Управление правовыми документами
- **GET** `/admin/legal/documents`
- **POST** `/admin/legal/documents/{id}/versions`
- **POST** `/admin/legal/versions/{id}/publish`

---

## 7. Мониторинг и диагностика Actuator (`/actuator`)
- **GET** `/actuator/health` — общее состояние бэкенда, БД Neon/PostgreSQL, Redis, диска.
- **GET** `/actuator/prometheus` — экспорт метрик для Prometheus:
  - `okututor_expiry_last_run_timestamp_seconds`
  - `http_server_requests_seconds_count`
  - `jvm_memory_used_bytes`
