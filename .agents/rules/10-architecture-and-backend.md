# Backend and Architecture Rules

- Сначала найди существующий domain package, service, repository, DTO и test pattern.
- Сохраняй controller → service → repository separation и текущие conventions проекта.
- Для request payload используй validation annotations/валидаторы, для permissions — server-side authorization и ownership checks.
- Не доверяй role, ownerId, userId или status, присланным клиентом.
- Используй транзакции там, где один пользовательский action меняет несколько связанных сущностей.
- Для PostgreSQL schema changes создавай новую Flyway migration; не переписывай уже применённые миграции.
- Не включай lazy entity serialization напрямую; используй текущие response DTO/mappers.
- Для пагинации, sorting и filters соблюдай единый формат проекта.
- Для публичных API возвращай минимальный необходимый набор данных.
- Не добавляй microservices, message broker или новую cache layer без обоснованной необходимости.
- Учитывай UTC на сервере и явное преобразование пользовательского локального времени.
- Любая статусная машина должна иметь разрешённые переходы и тесты на запрещённые переходы.
