# Security and Privacy Rules

- Считай все пользовательские данные и файлы недоверенными.
- Для каждого endpoint проверь authentication, authorization, ownership и роль.
- Проверяй IDOR/BOLA: замена UUID в URL не должна раскрывать/менять чужие ресурсы.
- Не полагайся на ProtectedRoute как на защиту backend.
- Не логируй пароли, JWT, refresh tokens, OAuth codes, API keys, email/phone без необходимости.
- Не возвращай внутренние поля User/TutorProfile в публичных DTO.
- Проверяй file upload по allowlist MIME/type, signature/decode, size, pixel dimensions, filenames и storage permissions.
- Санитизируй rich text только по реальной потребности; где допустим plain text — храни/рендери plain text.
- Rate limit auth, registration, contact/request creation, password reset, uploads и expensive endpoints.
- Cookie policy, CSRF, CORS, token storage, refresh rotation/grace window проверяй целиком, не меняй точечно без threat model.
- Admin actions должны проверять role на backend и по возможности писать audit records.
- Production secrets должны поступать через secret manager/environment; никаких известных fallback secrets.
- Для удаления аккаунта проверь токены, персональные данные, публикации, media, logs and legal retention; не обещай полное удаление, если данные остаются в backup.
