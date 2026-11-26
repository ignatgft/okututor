# OkuTutor — Платформа репетиторов Кыргызстана

Бесплатный маркетплейс резюме преподавателей и репетиторов в Кыргызстане (Free MVP, без платных услуг и подписок).

---

## 🛠 Технологический стек

- **Backend:** Java 21, Spring Boot 3.5.4, Spring Security 6, Spring Data JPA, Flyway (61 миграция), Jackson, Micrometer, Actuator
- **Frontend:** React 19, TypeScript, Vite, TanStack Query v5, Zustand, React Router 6, i18next (ru, en, kg), Lucide React
- **Инфраструктура:** PostgreSQL 16, Redis 7, Mailpit (SMTP-тестирование), Nginx (Reverse proxy), Docker Compose
- **Мониторинг:** Prometheus v2.53.0, Grafana 11.2.0, OpenTelemetry, структурированные JSON-логи

---

## 🚀 Быстрый старт (Docker Compose)

Все 7 сервисов поднимаются единой командой из корня репозитория:

```bash
# 1. Скопировать шаблон переменных окружения
cp .env.example .env

# 2. Запустить все сервисы в фоновом режиме
docker compose up -d --build
```

### Доступные сервисы и порты:

| Сервис | URL | Назначение |
|---|---|---|
| **Frontend** | [http://localhost:8081](http://localhost:8081) | Веб-интерфейс каталога, поиска и кабинета |
| **Backend API** | [http://localhost:8080](http://localhost:8080) | REST API бэкенда |
| **Swagger UI** | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) | OpenAPI документация |
| **Actuator Health** | [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health) | Healthcheck бэкенда |
| **Mailpit Web UI** | [http://localhost:8025](http://localhost:8025) | Просмотр писем и кодов верификации email |
| **Prometheus** | [http://localhost:9090](http://localhost:9090) | Сбор метрик и алерты |
| **Grafana** | [http://localhost:3000](http://localhost:3000) | Дашборды мониторинга (логин: `admin`, пароль: `admin`) |
| **PostgreSQL** | `localhost:5432` | База данных (`okututor` / `okututor_dev_password`) |
| **Redis** | `localhost:6379` | Кэш и сессии токенов |

Проверить статус здоровья контейнеров:
```bash
docker compose ps
```

---

## 🧪 Запуск тестов

### 1. Автоматизированный сквозной Smoke-сценарий (10 стадий)
Скрипт проверяет полный цикл: регистрация → чтение кода из Mailpit → верификация → логин → создание резюме → модерация админом → публикация на 30 дней → проверка поиска → админ-метрики:

```bash
powershell -ExecutionPolicy Bypass -File scripts/smoke_scenario.ps1
```

### 2. Backend Unit & Regression тесты
```bash
cd backend
mvn test
```

### 3. Frontend тесты (Vitest)
```bash
cd frontend
npm test
```

---

## 📂 Структура репозитория

```
okututor/
├── backend/            # Spring Boot приложение
├── frontend/           # React SPA приложение
├── monitoring/         # Конфигурация Prometheus, Grafana и правила алертов
├── docs/               # Документация проекта
│   ├── audit/          # Итоговый отчёт аудита и инвентарь файлов
│   ├── adr/            # Архитектурные решения (ADR)
│   ├── API.md          # REST API справочник
│   ├── ARCHITECTURE.md # Архитектура системы
│   ├── CONTRIBUTING.md # Регламент разработки и ветвления
│   ├── RUNBOOK.md      # Инструкции по эксплуатации и инцидентам
│   ├── LEGAL_COMPLIANCE.md # Чек-лист по персональным данным и cookies
│   └── PATTERNS_AND_REUSE.md # Архитектурные паттерны проекта
├── scripts/            # Вспомогательные скрипты аудита и тестирования
├── docker-compose.yml  # Единый файл оркестрации
└── .env.example        # Шаблон переменных окружения
```

---

## 📖 Документация

- [Итоговый отчёт аудита 2026](file:///docs/audit/AUDIT_REPORT.md)
- [Инвентарь файлов проекта](file:///docs/audit/FILE_INVENTORY.csv)
- [REST API Reference](file:///docs/API.md)
- [Архитектура OkuTutor](file:///docs/ARCHITECTURE.md)
- [Регламент разработки и ветвления](file:///docs/CONTRIBUTING.md)
- [ADR-001: Жизненный цикл резюме и TutorProfile](file:///docs/adr/ADR-001-resume-tutorprofile-lifecycle.md)
- [ADR-002: Apple Space Gray палитра и CustomSelect](file:///docs/adr/ADR-002-apple-space-gray-and-accessible-ui.md)
- [Runbook по устранению сбоев](file:///docs/RUNBOOK.md)
