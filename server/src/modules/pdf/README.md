# PDF Module

## Purpose

Documents the PDF generation and manipulation behavior that is currently implemented inline in the API router.

## Current implementation

All PDF operations live in `server/src/modules/api/index.js`.

### PDF Generation (`POST /api/pdf/generate`)
- Uses `pdf-lib` to create a new document from uploaded images.
- Each uploaded image becomes a PDF page sized to the source image dimensions.
- JPEG and PNG uploads are both supported.

### PDF Merge (`POST /api/pdf/merge`)
- Accepts 2+ PDF files via multipart upload.
- Uses `pdf-lib` `copyPages()` to extract all pages from each source document.
- Pages are appended in upload order to produce a single merged PDF.

### PDF Split (`POST /api/pdf/split`)
- Accepts a single PDF and a `ranges` parameter.
- Parses range strings: `all`, `each`/`every`, or custom groups like `1-3,5,7-9`.
- Each group becomes a new PDF via `pdf-lib` `copyPages()`.
- Single group returns a direct PDF; multiple groups are packaged into a ZIP using `archiver`.

### PDF Compress (`POST /api/pdf/compress`)
- Two-pass structural optimization using `pdf-lib`.
- Pass 1: repacks with `useObjectStreams: true` to eliminate redundant objects.
- Pass 2: reloads and resaves with batched object writing (`objectsPerTick: 100`) for further deduplication.
- Returns size reduction stats via response headers.

## Dependencies

- `pdf-lib` — all PDF operations (create, merge, split, compress).
- `archiver` — ZIP packaging for split output (imported via `createRequire` for ESM compatibility).

## Current status

- This directory does not yet contain a separate runtime PDF service module.
- It exists as the future extraction point if the inline route logic is split out later.
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
