# OkuTutor — полный функциональный каталог MVP

Это целевая спецификация простого бесплатного marketplace. Для каждой страницы и контрола Antigravity обязан найти точную реализацию, API, права, состояния и тест. Наличие компонента не означает, что функция работает.

## 1. Продуктовая модель и роли

OkuTutor помогает людям в Кыргызстане найти репетитора и отправить ему обращение. Пользователь может одновременно искать преподавателей и разместить собственную анкету. Это один аккаунт `USER`, без переключения ролей.

| Роль | Каталог | Своя анкета | Отправить обращение | Входящие обращения | Админка |
|---|---|---|---|---|---|
| Guest | Да | Нет | Да, форма контакта | Нет | Нет |
| USER | Да | Одна TutorProfile | Да | Только если владелец анкеты | Нет |
| ADMIN | Да | Может иметь свою анкету как USER | Да | Только собственные | Модерация, пользователи, обращения, support |
| SUPER_ADMIN | Да | Может иметь свою анкету как USER | Да | Только собственные | Всё выше + управление привилегиями |

Backend права обязательны. Frontend guards не являются защитой API.

## 2. Данные анкеты — реальные поля

Из текущего `TutorProfileCreateRequest`:

- `firstName` — обязательно, не пустое, до 100 символов.
- `lastName` — до 100.
- `title` — до 200.
- `shortDescription` — до 300.
- `about` — до 5000.
- `tutorType` — допустимые enum значения проверить в `TutorType`: `TEACHER`, `PROFESSIONAL_TUTOR`, `STUDENT_TUTOR`.
- `education` до 500, `university` до 200, `educationDetails` до 2000.
- `experienceYears` — optional integer; добавить проверку `>=0` на backend.
- `priceFrom`, `priceTo` — optional, >=0, `from <= to`; валюта MVP KGS.
- `online`, `offline` — boolean формат.
- `cityId`, `districtId` — UUID из reference API; район должен относиться к выбранному городу.
- `phone` — до 40 символов, приватный, не для public response.
- `subjectIds`, `levelIds` — UUID из справочников.
- `languages` — список доступных значений.

Фото сейчас нельзя считать загруженным по факту выбора filename. В MVP фото необязательно. Либо подключить реальный media/avatar upload с сохранённым объектом/URL и access policy, либо убрать фото-контрол.

**Запрещено показывать:** рейтинг 4.9, 127 отзывов, 5 лет, 800 KGS, fake bio, университет, достижения, фото, verified badge или любой другой придуманный факт. Текущие Review endpoints относятся к Course/Booking, а не к TutorProfile. Не отображать rating/reviews, пока не появится честный, подтверждённый marketplace review workflow.

---

# 3. Публичные страницы

## 3.1 `/` — главная marketplace

**Кому:** гостю и авторизованному USER. **Зачем:** быстро объяснить сервис и перевести к поиску или созданию анкеты.

### Верхняя навигация

| Контрол | Зачем | Что делает | Проверка |
|---|---|---|---|
| Логотип OkuTutor | Вернуться на главную | Link `/` | SPA переход без перезагрузки |
| «Найти репетитора» | Открыть каталог | Link `/tutors` | Каталог реально загружает данные |
| «Разместить резюме» | Начать создание анкеты | `/become-tutor` | Guest получает auth gate и возврат; USER попадает в create/edit wizard |
| «Категории» | Перейти к секции предметов | Scroll к существующему ID секции | Baseline возможное несовпадение `category`/`subjects`; исправить и проверить |
| Переключатель темы | Изменить light/dark | Существующий Theme context | Тема меняется и сохраняется, контраст не ломается |
| RU/EN/KY | Сменить язык | i18next | Меняется реальный UI, нет missing-key strings |
| «Войти» | Авторизация | `/login` или подтверждённый Auth modal | После входа корректный dashboard, ошибки видны |
| «Регистрация» | Создать аккаунт | `/register` | Validation/consent/email verification |
| Аватар/Профиль | Личный кабинет | `/dashboard` или `/dashboard/profile` | USER не перенаправляется на старую tutor/student область |
| «Выйти» | Завершить сессию | Реальный logout + revoke refresh session | UI очищает сессию; следующая private API попытка не авторизована |
| Hamburger | Мобильное меню | Open/close drawer | Escape закрывает, переход закрывает меню, фокус не теряется |

### Marketplace Hero

| Контрол | Зачем и действие | Данные | Условия готовности |
|---|---|---|---|
| Предмет | Выбрать предмет для поиска | Subjects reference API | Реальные options, clearable, canonical slug/ID |
| Город | Выбрать географию | City reference API; Online если это поддержано | Не использовать произвольный hardcoded список вместо backend источника |
| «Найти репетитора» | Перейти в каталог с параметрами | `/tutors?subject=...&city=...` или подтверждённые query keys | URL state → API filter → фактический результат совпадает |
| «Разместить своё резюме» | Начать публикацию | `/become-tutor` | Guest/auth return работает |

### Предметы, популярные анкеты, описание и Footer

- `SubjectGrid`: реальные subjects из API; клик фильтрует `/tutors`. Error/retry/empty состояния; не вечный spinner и не случайная подмена каталога.
- `PopTutor`: только реальные published profiles. Если нет данных — empty state с CTA, не fake «популярность».
- `HowItWorks`, `ForTutors`: только те обещания, которые реально поддерживаются.
- Footer links Terms/Privacy/Cookies должны вести на существующие документы. Draft юридического текста нельзя выдавать за утверждённый юристом.

## 3.2 `/tutors` — поиск и каталог

**Кому:** guest/USER. **Зачем:** найти подходящего репетитора.

| Контрол | Ожидаемое поведение | Backend/URL | Проверка |
|---|---|---|---|
| Search | Полнотекстовый поиск имени/предмета/описания | `q` | debounce, Enter, clear, реальный server search |
| Subject | Выбор предмета | `subject` | Reference option соответствует API value |
| City | Город | `city` slug или ID | Реальный backend filter |
| District | Район (только если есть reference+API) | `district` | Удалить из UI, если это только декоративный control |
| Format | Online/offline | `online` / `offline` или действующий enum | Результат реально отфильтрован |
| Price min/max | Бюджет за занятие в KGS | `minPrice/maxPrice` или проверенные alias | Числа >=0, min<=max; пусто не становится NaN/0 |
| Level | Для какого уровня ученика | `level` | Reference API, фильтр реально работает |
| Language | Язык занятий | `language` | Оставлять только при реальном backend filter |
| Tutor type | Тип репетитора | `tutor_type` | Оставлять, если enum и смысл понятны пользователю |
| Sort | Сортировка | `sort` | Только реальный backend sort; нельзя сортировать по fake rating |
| Active chips | Удалить один filter | URL/state/API refetch | Остальные фильтры остаются |
| Reset | Сбросить всё | Очистить query string, page=0 | Полный список перезагружается |
| Pagination | Следующая/предыдущая страница | page/size | Границы disabled, URL/state/API согласованы |
| Карточка | Открыть анкету | `/tutor/:slug` | Не использовать legacy `/repetitor/...` redirect |
| Contact | Открыть форму | Единый request flow (3.3) | Реальный request, не local-only success |

Карточка показывает только фактические данные: ФИО, реальное фото, title/shortDescription, предметы, город, формат, цену, стаж при наличии. Не показывать rating/reviews/verified/achievements без реального источника.

**Избранное:** не входит в MVP baseline, пока нет backend storage, API, ownership checks и тестов. Если кнопка сейчас есть и не работает — удалить/скрыть, а не оставлять локальную фикцию.

## 3.3 `/tutor/:slug` — публичная анкета

**Кому:** guest/USER. **Зачем:** понять предложение и отправить обращение.

Показывать только реальные: имя, title, shortDescription, about, предметы, уровни, город/район, online/offline, цену KGS, образование/опыт/языки при наличии, настоящее фото если загружено. Если profile не published/удалён/blocked — безопасный экран «Анкета недоступна».

Не показывать публично: phone, email, userId, moderation reason, internal status, fake reviews/ratings, legacy courses/lessons.

| Кнопка/форма | Действие/API | Приёмка |
|---|---|---|
| Breadcrumb Home | `/` | Открывает главную |
| Breadcrumb Tutors | `/tutors` | Возвращает в каталог |
| «Связаться» / «Оставить заявку» | Открывает одну форму contact request | Guest и USER; self-contact запрещён backend |
| Имя | `studentName` | Required, trim, длина согласована с DTO |
| Контакт | `studentContact` | Required, trim, контакт не попадает в public response |
| Сообщение | `message` | Optional, max length и безопасный output |
| «Отправить заявку» | `POST /api/v1/tutor-requests` | 2xx → success; 400/403/404/409/429/network → реальное объяснение, без false success |
| «Назад к каталогу» | `/tutors` | Предсказуемая навигация |

После успеха гость видит: «Обращение отправлено. Репетитор свяжется по указанному контакту». Не обещать гостю личный кабинет/чат. Авторизованный USER видит исходящую заявку, владелец анкеты — входящую. Ошибка создания чата не отменяет уже созданный request.

---

# 4. Авторизация

## `/register`
Имя, email, пароль, повтор пароля если требуется текущим UI, обязательные Terms и personal-data consent. Checkbox не отмечены заранее. Реальный `/api/v1/auth/register`, error handling, resend/verification state. Не создавать session до обязательной верификации, если так настроен backend.

## `/verify-email`
Email/code input; Verify вызывает действующий endpoint; Resend имеет rate-limit feedback. Неверный/просроченный код не подтверждает аккаунт.

## `/login`
Email/password, toggle visibility, submit disabled while pending. Реальный login API. Generic auth error — если такова политика backend. Refresh rotation, session expiry, logout проверять интеграционно. Contact intent после login восстанавливается не более одного раза.

## `/forgot-password` и `/reset-password`
Forgot: email → реальный endpoint; ответ не раскрывает existence email. Reset: code/new password → действующий API flow. После reset старые refresh sessions revoked.

## OAuth callback
Google login показывать только если credentials/redirect URI настроены. Без secrets не обещать рабочую кнопку; production не должен запускаться с placeholder credentials.

---

# 5. Личный кабинет USER

## `/dashboard` — overview

Приветствие с реальным именем; статус собственной анкеты; real profile views, если источник существует; incoming/outgoing requests отдельно; unread count только из реального API; shortcuts к анкете, каталогу, обращениям, профилю и настройкам. Не выводить fake revenue, lessons, active users, ratings. Ошибка загрузки — отдельное состояние, не ноль.

## `/dashboard/resume` — моя анкета

| Состояние | Действие владельца |
|---|---|
| Нет анкеты | «Создать анкету», «Найти репетитора» |
| DRAFT | «Продолжить заполнение», «Отправить на модерацию» |
| PENDING_MODERATION | Статус и информация об ожидании; никаких owner approve/reject controls |
| PUBLISHED | «Открыть публичную анкету», «Редактировать» |
| REJECTED | Причина отказа, «Исправить и отправить повторно» |
| SUSPENDED | Причина/объяснение, support link; owner не может restore |

Baseline backend разрешает update DRAFT/REJECTED/PUBLISHED и сохраняет PUBLISHED при редактировании. Проверить бизнес-риск и принять документированное решение. Не добавлять expire/renew/hide без scope decision.

## `/dashboard/requests` и `:conversationId`
- Явные вкладки «Полученные» и «Отправленные» — две реальные выборки.
- Показать участника/профиль, текст, дату, статус, доступные действия.
- Получатель может mark viewed, CONTACTED, CLOSED согласно реальным transition rules.
- Отправитель может посмотреть и закрыть собственную заявку, но не выставить VIEWED/CONTACTED.
- Если in-app chat оставлен, messages list/detail/send/read работают только для участников. Polling только на активной беседе и прекращается при выходе.
- Loading/empty/error/retry/send error/mobile back states.

## `/dashboard/profile`
Показать и редактировать данные только текущего аккаунта через действующий users/me endpoint. Не создавать вторую независимую анкету. Ссылка к tutor profile ведёт в `/dashboard/resume`. После сохранения обновить auth/query state.

## `/dashboard/settings`
Смена пароля, logout/current sessions, email change только если реальная verification flow поддерживается. Delete-account показывать только если backend завершает все связанные процессы безопасно (анонимизация/удаление, сессии, анкета, контакты, audit); иначе убрать кнопку до готовности. Не оставлять обещающих no-op controls.

## Support `/support`, `/support/new`, `/support/tickets/:ticketId`
Создать тикет (category/title/description), просматривать свои, отправлять сообщение, mark read, close/reopen по backend transition. Вложения только при работающем upload/access check. Пользователь видит только свои тикеты.

---

# 6. Админка

## `/admin` — overview
Только реальные показатели: total users, published profiles, pending moderation, total/new requests, unresolved support tickets — только если endpoints существуют и считают корректно. Нельзя отображать revenue, уроки, bookings, активных пользователей или reviews без реальной измеряемой логики. Карточка-кнопка открывает правильный отфильтрованный список.

## `/admin/tutors` — модерация TutorProfile
- Canonical `TutorProfile`, не legacy `TutorApplication`.
- Status filters: PENDING_MODERATION, PUBLISHED, REJECTED, SUSPENDED; DRAFT по необходимости.
- Таблица: имя, предметы, город/формат, дата, статус; server pagination.
- Детали: реальная анкета; owner contacts доступны admin only.
- Approve → `POST /api/v1/admin/tutors/{id}/approve`.
- Reject → обязательная причина → `/reject`.
- Suspend → причина → `/suspend`.
- Restore → `/restore`.
- Confirm/loading/error/success/re-fetch/audit. UI не меняет статус до ответа backend.

## `/admin/users`
Search/filter/pagination. Block/unblock с confirm; backend запрещает self-block и privilege escalation. Role change только SUPER_ADMIN; новые значения USER/ADMIN/SUPER_ADMIN. Legacy roles можно отображать как старые данные, но не назначать в новой форме. Никаких password/hash/session tokens в UI.

## `/admin/requests`
Admin-only API; фильтры status/date/search только если backend поддерживает. Контактные данные — минимум необходимого для модерации. При ошибке admin API не fallback на обычный USER endpoint. Никаких скрытых `display:none` links и фальшивых bulk actions.

## `/admin/support`
Очередь тикетов, фильтры, назначить/взять, ответ, priority/status, закрыть/переоткрыть. Доступ и audit. Ошибки не должны терять текст ответа.

## Reports / Reviews / SEO / Metrics
Оставлять в основной навигации только реально работающие MVP страницы. Course Reviews — не tutor rating. Metrics — только реальные counters. SEO settings только если меняют canonical public metadata/sitemap. Reports только если есть end-to-end create/review workflow.

---

# 7. Статусы и переходы

## TutorProfile

- Нет профиля → POST `/tutors` → DRAFT.
- DRAFT → PUT `/tutors/me` saves.
- DRAFT → POST `/tutors/me/submit` → PENDING_MODERATION.
- PENDING_MODERATION → admin approve → PUBLISHED.
- PENDING_MODERATION → admin reject(reason) → REJECTED.
- REJECTED → owner edits → remains REJECTED; resubmit → PENDING_MODERATION.
- PUBLISHED → owner edit permitted by current policy; status remains PUBLISHED — verify safety.
- PUBLISHED → admin suspend(reason) → SUSPENDED.
- SUSPENDED → admin restore → PUBLISHED.

Only backend admin actions may set published. No client-only state authority.

## TutorRequest

Current status enum: `NEW`, `VIEWED`, `CONTACTED`, `CLOSED`. Current service allows status transitions such as NEW→VIEWED/CONTACTED/CLOSED, VIEWED→CONTACTED/CLOSED, CONTACTED→CLOSED; verify in current implementation. Student may only close own request. Tutor can only update requests assigned to them. Guest requests have no studentUserId and cannot appear as sent items in a guest dashboard. Authenticated duplicate active requests are currently handled idempotently; guest spam relies on rate limit unless new safe idempotency exists.

## Support tickets

Inspect actual status enum and services. Do not invent statuses/actions.

---

# 8. Для каждой кнопки обязательна карточка проверки

Аудит должен ответить:
1. Кто видит/может нажать?
2. Зачем кнопка нужна пользователю?
3. Какой handler/route запускает?
4. Какой API/данные использует?
5. Какие поля валидируются?
6. Loading state?
7. Success state/navigation?
8. Поведение при 400/401/403/404/409/429/5xx/offline?
9. Можно ли повторить? Есть ли idempotency?
10. Keyboard/mobile/accessibility?
11. Каким test ID подтверждено?

No-op buttons, `href="#"`, false success toast, fake favorite, silent catch, decorative filter должны быть удалены либо реализованы.

## 9. MVP Definition of Done

Готово только если:
- все P0 закрыты;
- public catalog/profile используют реальные API данные;
- fake public facts/reviews/ratings удалены;
- wizard create/edit/submit работает через TutorProfile;
- admin moderates именно TutorProfile;
- incoming/outgoing requests не теряются;
- Guest/USER contact flow работает;
- ключевые страницы/формы/кнопки проверены в браузере;
- Security review не оставил critical/high issues;
- `mvn verify`, frontend lint/test/build, browser E2E прошли либо честно BLOCKED с evidence;
- production config не содержит default secrets/demo seed;
- Actuator/PII/API защищены;
- docs и GitHub CI отражают реальную архитектуру.
