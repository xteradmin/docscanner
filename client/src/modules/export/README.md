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
- Presents export formats as selectable cards with format descriptions and selected-output summary.
- Disables format switching while an export is running.
- Shows a user-facing export error if PDF or image export fails.
- Keeps the exporting state active until generated image blobs have been created and download links are triggered.

## Current status

- The current client UI exports entirely in-browser.
- The server endpoint `/api/pdf/generate` exists, but `ExportPanel.jsx` does not call it yet.
- For server-side PDF operations (combine, split, compress), see the `tools/` module.
