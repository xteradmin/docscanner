# Auth Module

## Purpose

Provides a lightweight auth context scaffold for future authenticated document features.

## Components

- `AuthProvider.jsx`
  Stores the auth token in local storage, exposes login/register/logout helpers, and tries to fetch the current user.

## Implemented behavior

- Reads `token` from `localStorage`.
- Calls `/api/auth/me` when a token exists.
- Exposes `login(email, password)`, `register(email, password)`, and `logout()`.

## Current status

- There is no login UI in the current scanner flow.
- The current server does not mount `/api/auth/*` routes.
- This module is a client-side scaffold rather than a finished feature.
