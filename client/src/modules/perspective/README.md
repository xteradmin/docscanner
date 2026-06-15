# Perspective Module

## Purpose
Corrects perspective distortion by warping detected document to a rectangle.

## Components
- **PerspectiveTransform.jsx**: Takes 4 corners + source image, outputs warped rectangle

## Key Features
- Computes perspective transform matrix
- Applies affine warp to standard A4/letter rectangle
- Output size: A4 proportions (210:297), scaled to 300 DPI
- Default output: 2480 × 3508 pixels

## Exports
- `warpPerspective(image, corners, outputSize)` → `Promise<Blob>`

## Algorithm
1. Compute perspective transform matrix from 4 source corners
2. Define target rectangle (A4 aspect ratio)
3. Apply warp transformation
4. Crop to output dimensions

## Dependencies
- Canvas API (built-in)
