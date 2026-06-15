# API Module

## Purpose

Holds the currently mounted Express API routes for the app.

## Implemented routes

- `GET /api/health`
  Returns `{ status, timestamp }` for liveness checks.

- `POST /api/pdf/generate`
  Accepts up to 20 uploaded images through Multer memory storage, embeds JPEG or PNG images into a `pdf-lib` document, and returns the generated PDF as a download.

- `POST /api/documents`
  Creates a document id, ensures an upload directory exists, and returns document metadata.

- `GET /api/documents`
  Returns an empty `documents` array placeholder.

## Current status

- This router is the real server implementation today.
- There is no mounted `/api/auth/*` router yet.
- There is no `/api/upload/image` endpoint in the current server.
