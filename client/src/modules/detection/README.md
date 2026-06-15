# Detection Module

## Purpose
Auto-detects document boundaries in captured images.

## Components
- **DocumentDetector.jsx**: Receives image blob, returns 4 corner points

## Key Features
- Uses Canvas API for edge detection
- Detects largest rectangular contour
- Returns normalized coordinates (0-1 range)
- Fallback: manual corner dragging if detection fails

## Exports
- `detectDocument(imageBlob)` → `Promise<{corners: Point[]}>`

## Algorithm
1. Convert to grayscale
2. Apply Gaussian blur
3. Canny edge detection
4. Find contours
5. Approximate polygon
6. Return 4-point contour

## Dependencies
- Canvas API (built-in)
