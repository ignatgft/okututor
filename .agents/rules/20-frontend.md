# Frontend Rules

- Сначала изучи `frontend/package.json`, tsconfig, Vite config, router, existing feature folders, API client, stores and query keys.
- Текущая версия, обнаруженная при подготовке комплекта: React 19, TypeScript 5.9, Vite 6, React Router 7, TanStack Query 5, Zustand 5. Перепроверь перед работой.
- Переиспользуй существующий API client, auth store, TanStack Query patterns, UI primitives и i18n.
- Не создавай второй axios/fetch client или второй источник истины для server data.
- Не смешивай server state в Zustand, если он уже управляется TanStack Query; Zustand оставляй для подходящего client state.
- Все async страницы обязаны иметь loading, error, empty и success состояния.
- Формы должны иметь клиентскую UX-валидацию и опираться на backend validation.
- Любая кнопка должна выполнять реальное действие или быть явно disabled; никаких фальшивых click handlers.
- Не дублируй route/page/layout; проверь существующие aliases и redirects.
- Используй существующие CSS conventions и responsive tokens. Не добавляй новый UI framework без согласования.
- Все новые пользовательские строки проходят через текущий i18n подход.
- Следи за keyboard navigation, focus, labels, aria attributes, contrast and reduced motion.
