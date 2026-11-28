# Source of Truth and Evidence

- Код текущего checkout — первичный источник. Документы и память не заменяют чтение исходников.
- Для каждого утверждения указывай `path`, symbol/route/endpoint и line range.
- Не выдумывай filenames, handlers, env vars, endpoints, table names или test outcomes.
- Разделяй fact / inference / recommendation.
- Если функция найдена только на frontend, пометь `ROUTE_ONLY` или `UI_ONLY`, пока не найден API и тест.
- Если backend endpoint найден, но frontend не вызывает его, пометь `API_ONLY`.
- Если старая карта расходится с кодом — зарегистрируй divergence; не переписывай код ради соответствия карте.
- Перед изменением legacy области построй dependency graph: routes, imports, API clients, controllers, services, entities, migrations, jobs, tests, navigation, deep links.
