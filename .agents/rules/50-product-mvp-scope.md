# Product Scope — Free Marketplace MVP

- Первичная цель: работающий marketplace репетиторов в Кыргызстане.
- Основной путь: visitor → search → tutor profile → contact/request; USER → create/update TutorProfile → moderation; ADMIN → approve/reject.
- TutorProfile является текущей основной моделью анкеты, пока код и миграции подтверждают это. Не создавать `Resume` duplicate entity.
- Не добавлять оплаты, subscriptions, commissions, course authoring, learning management, booking/video lessons в MVP без отдельного решения владельца.
- Избранное, отзывы, live chat, support ticketing, advanced analytics и advanced SEO admin не являются automatic must-have; докажи ценность/готовность end-to-end.
- Не заменяй отсутствующую функцию красивым UI, локальным state или mock data.
- Изменения UX должны сохранять mobile-first marketplace pattern.
- Любое изменение scope фиксируй в `docs/MVP_FUNCTIONAL_MAP.md` и `docs/AUDIT_TASK_BACKLOG.md`.
