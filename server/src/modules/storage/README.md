# Storage Module

## Purpose

Documents the current storage behavior and the intended future extraction point for a real storage service.

## Current implementation

- `POST /api/documents` resolves `UPLOAD_DIR` and ensures a directory exists for the new document id.
- The current route returns metadata only.
- Uploaded document pages and generated PDFs are not yet persisted through a dedicated storage module.

## Current status

- There is no extracted `save/get/delete` storage API in this directory yet.
- Cleanup, persistence, and document retrieval are still future work.
