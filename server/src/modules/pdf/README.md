# PDF Module

## Purpose

Documents the PDF generation behavior that is currently implemented inline in the API router.

## Current implementation

- PDF generation currently lives in `server/src/modules/api/index.js`.
- The server uses `pdf-lib` to create a new document.
- Each uploaded image becomes a PDF page sized to the source image dimensions.
- JPEG and PNG uploads are both supported.

## Current status

- This directory does not yet contain a separate runtime PDF service module.
- It exists as the future extraction point if the inline route logic is split out later.
