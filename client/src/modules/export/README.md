# Export Module

## Purpose
Export processed documents as PDF or image files.

## Components
- **ExportPanel.jsx**: UI for choosing PDF/image export
- **ExportService.js**: Export logic

## Export Options

### Client-Side (Offline)
- **Image**: Direct download as JPEG/PNG via Blob API
- **PDF**: Uses jsPDF for simple PDF generation

### Server-Side (Online)
- **PDF**: POST to `/api/pdf/generate` for high-quality PDF

## Exports
- `exportAsPDF(pages)` → Promise<Blob>
- `exportAsImage(blob, filename, format)` → void

## Dependencies
- `jspdf` (client-side PDF)
- Canvas API (image export)
