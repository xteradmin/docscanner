# Auth Module (Server)

## Purpose

Reserved location for a future extracted server authentication module.

## Current status

- No server auth routes or middleware are implemented in this directory yet.
- The current Express app does not mount `/api/auth/register`, `/api/auth/login`, or `/api/auth/me`.
- Auth-related dependencies are present in `server/package.json`, but they are scaffolding for later work.

## Relationship to the client

- `client/src/modules/auth/AuthProvider.jsx` already expects these routes.
- Until server auth is implemented, that client auth context remains non-functional beyond local token storage behavior.
