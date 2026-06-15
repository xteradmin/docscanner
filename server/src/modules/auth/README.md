# Auth Module (Server)

## Purpose
JWT-based authentication with bcrypt password hashing.

## Routes
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login, returns JWT
- `GET /api/auth/me` - Get current user

## Middleware
- `authMiddleware` - Verifies JWT in Authorization header

## Database Schema
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  created_at DATETIME
);
```

## Dependencies
- `bcryptjs` (password hashing)
- `jsonwebtoken` (JWT tokens)
- `better-sqlite3` (database)
