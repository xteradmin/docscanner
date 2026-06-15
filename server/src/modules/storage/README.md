# Storage Module

## Purpose
File storage abstraction layer.

## Features
- Default: Local filesystem at `/data/docscanner/uploads/<docId>/`
- Auto-cleanup: Delete anonymous docs >24h old

## Exports
- `saveDocument(id, images, pdf)` → Promise<void>
- `getDocument(id)` → Promise<{images, pdf}>
- `deleteDocument(id)` → Promise<void>

## Dependencies
- `fs` (Node.js built-in)
- `path` (Node.js built-in)
