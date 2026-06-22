# DocScanner

DocScanner is a browser-based document scanner built with React and Express. It supports camera capture or image upload, document edge detection, manual corner adjustment with magnifier zoom, perspective correction, filter controls, multi-page document assembly, and export as PDF, JPG, or PNG from a production-oriented scanner interface. A dedicated PDF Tools page provides server-side combine, split, and compress utilities for existing PDF files.

## Current Flow

### Scanner
1. Start from a source image: take a photo or upload an image file.
2. Detect the document edges and adjust the four corners if needed.
3. Crop the document and apply presets or manual filters.
4. Add the processed page to a document.
5. Export the document or add another image to combine into the same PDF.

### PDF Tools (`/tools`)
1. **Combine**: Upload 1+ PDF files, visually arrange and reorder specific pages via a high-performance drag-and-drop grid, and merge into a single PDF.
2. **Split**: Upload a PDF, choose page ranges or split every page, download as ZIP or single PDF.
3. **Compress**: Upload a PDF, optimize its internal structure, download a smaller file with size reduction stats.

## Implemented Features

- Camera capture using the browser MediaDevices API with rear-camera preference on mobile.
- Image upload via file picker or drag and drop.
- Canvas-based document edge detection with manual corner fallback.
- Perspective warp from a four-corner selection into a flattened rectangle.
- Filter presets plus manual brightness, contrast, saturation, and sharpen sliders.
- Filter application from the original cropped image, not from previously filtered output.
- Production scanner shell with document status, workflow progress, responsive capture/edit/review layouts, and accessible page controls.
- Dedicated document step for page review, reordering, removal, and export.
- Client-side export to PDF, JPG, or PNG with format cards, selected-format summary, disabled export states, and visible export errors.
- User-facing recovery messages for failed edge detection, crop processing, image filtering, invalid uploads, and export failures.
- Server endpoints for health checks, PDF generation, and stub document metadata creation.
- **PDF Tools page** with navigation bar, tool selection cards, and three server-side utilities:
  - **Combine PDFs** (`POST /api/pdf/merge`): Parses PDFs client-side for visual thumbnail generation, allows specific page-level reordering via native drag-and-drop, and merges via `pdf-lib`.
  - **Split PDF** (`POST /api/pdf/split`): extracts page ranges or splits every page into a ZIP via `archiver`.
  - **Compress PDF** (`POST /api/pdf/compress`): repacks with optimized object streams, returns size reduction stats.

## Development

Install dependencies:

```bash
git clone https://github.com/xteradmin/docscanner.git
cd docscanner
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

Run the app from the repository root:

```bash
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:3000`

You can still run each side separately:

```bash
cd client && npm run dev
cd server && npm run dev
```

## Docker

```bash
docker compose up --build
```

The Docker image builds the Vite client, installs the Express server runtime dependencies, and serves the built frontend from the Node container on port `3000`.

## Module Map

### Client modules

- `camera/`: camera capture and image upload entry points.
- `detection/`: document corner detection from an input image.
- `perspective/`: four-point warp and crop output.
- `filters/`: image enhancement and manual filter operations.
- `export/`: client-side PDF and image export UI.
- `tools/`: PDF Tools UI — CombineTool, SplitTool, CompressTool (server-side processing).
- `auth/`: auth context scaffold for future login flows.
- `pages/`: legacy standalone page manager component; the current document flow is handled in `ScannerPage.jsx`.

### Pages

- `ScannerPage.jsx`: main scanner workflow at `/`.
- `ToolsPage.jsx`: PDF Tools selection and active tool workspace at `/tools`.

### Server modules

- `api/`: mounted Express routes for `/api/health`, `/api/pdf/generate`, `/api/pdf/merge`, `/api/pdf/split`, `/api/pdf/compress`, and `/api/documents`.
- `auth/`: planned server auth module, not currently implemented as runtime routes.
- `pdf/`: planned extracted PDF service; current PDF logic lives in `server/src/modules/api/index.js`.
- `storage/`: planned extracted storage service; current document route only creates a directory and returns metadata.

## Current Status Notes

- The client export UI currently uses `jsPDF` and Canvas in-browser.
- The server PDF endpoint exists and accepts JPEG or PNG uploads, but the current export UI does not call it yet.
- In-progress documents are kept in React state for the current browser session only; there is no IndexedDB draft persistence or account-backed document history yet.
- `AuthProvider.jsx` expects `/api/auth/*` endpoints, but those routes are not mounted in the current server.
- `better-sqlite3`, `bcryptjs`, and `jsonwebtoken` are installed as scaffolding for later persistence/auth work.

## License

MIT
