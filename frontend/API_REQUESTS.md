# Frontend API Contract

This frontend reads the backend base URL from `VITE_API_URL`.

Default local value:

```env
VITE_API_URL=http://localhost:8080
```

## Common rules

- Auth token is stored in `localStorage` under `token`.
- Authenticated requests use `Authorization: Bearer <token>`.
- JSON requests send `Content-Type: application/json`.

## Endpoints used by the frontend

### Auth

- `POST /login`
- `POST /register`
- `GET /me`
- `GET /auth/google`

### Courses

- `GET /courses`
- `POST /courses`
- `GET /courses/:courseId`
- `DELETE /courses/:courseId`
- `GET /courses/:courseId/reviews`
- `POST /courses/:courseId/reviews`
- `GET /users/:userId/courses`

### Profile

- `GET /user/:userId`
- `PUT /user/:userId/profile`

### Meeting

- `POST /create-meeting/`

## Request shapes

### `POST /login`

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

### `POST /register`

```json
{
  "email": "user@example.com",
  "password": "secret",
  "repeat_password": "secret",
  "full_name": "John Doe"
}
```

### `GET /me`

- Headers:

```http
Authorization: Bearer <token>
```

### `POST /courses`

```json
{
  "user_id": "backend-user-id",
  "title": "Mathematics for beginners",
  "description": "Course description",
  "days": "weekdays",
  "specific_days": null,
  "group_size": "individual",
  "location_type": "online",
  "experience": 5,
  "price_per_hour": 500
}
```

If `days === "specific"`, `specific_days` is sent as a comma-separated string like:

```json
"Monday,Wednesday,Friday"
```

### `DELETE /courses/:courseId`

- No body.
- Uses bearer auth.

### `GET /users/:userId/courses`

- Used for tutor-owned courses and auditorium access checks.
- Uses bearer auth.

### `GET /courses/:courseId/reviews`

- No body.

### `POST /courses/:courseId/reviews`

```json
{
  "student_id": "user-id",
  "rating": 5,
  "comment": "Great course"
}
```

### `GET /user/:userId`

- Used to render tutor cards and tutor profile data.

### `PUT /user/:userId/profile`

```json
{
  "full_name": "John Doe",
  "email": "user@example.com",
  "phone": "+996...",
  "location": "Bishkek",
  "bio": "Short bio",
  "telegram": "https://t.me/...",
  "instagram": "https://instagram.com/...",
  "whatsapp": "https://wa.me/...",
  "avatar": "https://..."
}
```

### `POST /create-meeting/`

```json
{
  "topic": "Okututor Meeting",
  "start_time": "2026-08-17T12:00:00.000Z",
  "duration": 30
}
```

## Frontend files that use the API

- [`frontend/src/api/auth.js`](./src/api/auth.js)
- [`frontend/src/components/AuthRegister/Auth.jsx`](./src/components/AuthRegister/Auth.jsx)
- [`frontend/src/components/AuthRegister/Register.jsx`](./src/components/AuthRegister/Register.jsx)
- [`frontend/src/components/Course.jsx`](./src/components/Course.jsx)
- [`frontend/src/components/CourseView.jsx`](./src/components/CourseView.jsx)
- [`frontend/src/components/Profile.jsx`](./src/components/Profile.jsx)
- [`frontend/src/components/SearchComp/SearchBar.jsx`](./src/components/SearchComp/SearchBar.jsx)
- [`frontend/src/components/HomeSection/PopTutor.jsx`](./src/components/HomeSection/PopTutor.jsx)
- [`frontend/src/components/CardCourse.jsx`](./src/components/CardCourse.jsx)
- [`frontend/src/pages/pgAuditorium.jsx`](./src/pages/pgAuditorium.jsx)
