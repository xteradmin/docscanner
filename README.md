# DocScanner

A web-based document scanner that works on laptop and Android mobile. Capture photos, auto-detect document boundaries, correct perspective, enhance brightness/color, and export as PDF or image.

## Features

- **Camera capture** — Uses rear camera on mobile, webcam on laptop
- **Auto-detect** — Automatically finds document edges
- **Manual adjustment** — Drag blue corner handles with magnifier for precise positioning
- **Perspective correction** — Warps trapezoid documents into straight rectangles
- **Image filters** — Brightness, contrast, saturation, sharpen, auto-enhance
- **Multi-page documents** — Add/remove/reorder pages
- **Export** — Download as PDF, JPG, or PNG

## Quick Start

```bash
git clone https://github.com/xteradmin/docscanner.git
cd docscanner

# Client
cd client && npm install && npm run dev

# Server (separate terminal)
cd server && npm install && npm start
```

Client: `http://localhost:5173` | Server: `http://localhost:3000`

## Build & Deploy

```bash
docker compose up --build
```

## Tech Stack

- **Frontend:** React 18 + Vite
- **Backend:** Express.js
- **PDF:** jsPDF (client) + pdf-lib (server)
- **Image processing:** Canvas API
- **Auth:** Optional JWT (bcryptjs + jsonwebtoken)
- **Database:** SQLite (better-sqlite3)

## Project Structure

```
docscanner/
├── client/src/modules/
│   ├── camera/        # Camera capture
│   ├── detection/     # Document edge detection
│   ├── perspective/   # Perspective transform
│   ├── filters/       # Image enhancement
│   ├── pages/         # Multi-page management
│   ├── export/        # PDF/image export
│   └── auth/          # Optional authentication
├── server/src/modules/
│   ├── api/           # API routes
│   ├── auth/          # JWT auth
│   ├── pdf/           # PDF generation
│   └── storage/       # File storage
└── docs/
```

## License

MIT
