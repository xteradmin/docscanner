# Export Module

## Purpose

Exports the assembled document pages from the dedicated document step.

## Components

- `ExportPanel.jsx`
  UI for selecting export format and downloading the current document.

## Implemented behavior

- Uses `jsPDF` in the browser for PDF export.
- Uses an off-screen canvas to export each page as JPG or PNG.
- Loads each stored page blob into an `Image` before export.
- Centers PDF pages inside an A4 canvas while preserving aspect ratio.

## Current status

- The current client UI exports entirely in-browser.
- The server endpoint `/api/pdf/generate` exists, but `ExportPanel.jsx` does not call it yet.
