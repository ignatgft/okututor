# Chat WebSocket — Presence + Typing

## Транспорт

`GET /ws?token=JWT` или `Authorization: Bearer` (query — единственный вариант для `new WebSocket` в браузере).  
`backend/src/main/java/com/okututor/backend/chat/ChatWebSocketHandler.java:42` → `JwtService.parse(token)` → `userId`.  
`SecurityConfig.java:99` `permitAll /ws/**` (auth внутри handler, `CloseStatus.NOT_ACCEPTABLE` при 401).  
`ChatWebSocketConfig.java:12` `setAllowedOriginPatterns(AppProperties.cors)`.

## Типы сообщений (JSON)

- `ping` → `pong` (heartbeat 30s, `useChatWebSocket.ts:80`)
- `typing {conversationId, isTyping}` → broadcast `typing` другим участникам (искл. отправителя), TTL 3s
- `message {conversationId, body}` → `ChatService.sendMessage` (Jsoup sanitize, 2000 лимит, participant check + admin bypass) → `broadcastToConversation` (participants + онлайн-админы)
- `read {conversationId}` → `ChatService.markRead`
- `presence {userId,status:online/offline}` → broadcast всем онлайн
- `connected {online: [userIds]}` — ack при подключении

## Фронт

`frontend/src/features/chat/hooks/useChatWebSocket.ts:64` singleton, `wsUrl()` внутри `connect()` (свежий токен), exponential backoff `3s*1.5^n≤30s` 10 попыток, `1008→stop`.  
`useMessages.ts:21` `refetchInterval:false` (WS push), `useUnreadCount.ts:18` `false`, `PgMarketplaceChat.tsx:38` `sendMessageWs` → REST fallback, `markReadWs`.  
`ChatWindow.tsx:48` header `● в сети/не в сети` + `печатает...`, `MessageInput.tsx:15` `onTyping` debounce 2s.

## Скорость

Было: `poll 4s/20s` → 4s задержка. Стало: WS push `<50ms`, `invalidateQueries(["messages",convId])` мгновенно.  
RPS: Neon `page50 p95 4.78s`, Local `30ms` (×150). WS не меняет RPS листинга, но сокращает chat latency с 4s до 0.

## Админ

`ChatService.java:251` `isAdmin→findAll` для `listConversations` (видит все чаты), `get/listMessages/send/markRead` bypass participant для `ADMIN/SUPER_ADMIN`, `frontend/src/config/navigation.ts:62` + `constants/roles.ts:78` добавили `admin_messages` + `conversations.read/send`.

