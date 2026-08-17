# Okututor

Frontend:
- Location: `frontend/`
- Stack: React + Vite
- Env example: [`frontend/.env.example`](frontend/.env.example)
- API contract: [`frontend/API_REQUESTS.md`](frontend/API_REQUESTS.md)

Backend:
- Location: `backend/`
- Stack: Java 17 + Spring Boot
- Env example: [`backend/.env.example`](backend/.env.example)
- Mock login accounts are documented in [`backend/README.md`](backend/README.md)

Local development:
1. Start the backend.
1. Copy `frontend/.env.example` to `frontend/.env` if needed.
1. Run the frontend:

```powershell
cd D:\dev\okututor\frontend
npm install
npm run dev
```
