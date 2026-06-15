# PDF Module

## Purpose
PDF generation engine using pdf-lib.

## Features
- Accepts array of JPEG/PNG buffers
- Outputs single multi-page PDF
- Optional: page labels, metadata, bookmarks

## Exports
- `generatePDF(images, options)` → Promise<Buffer>

## Dependencies
- `pdf-lib`
