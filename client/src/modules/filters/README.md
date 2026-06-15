# Filters Module

## Purpose
Image filtering for brightness, contrast, color restoration, and enhancement.

## Components
- **ImageFilters.jsx**: Canvas-based pixel manipulation

## Available Filters
- **brightness**: Adjust pixel RGB values
- **contrast**: S-curve contrast adjustment
- **grayscale**: Convert to grayscale
- **sharpen**: Unsharp mask convolution
- **colorRestore**: Auto white balance + saturation boost
- **enhance**: Combined sharpen + auto-contrast + color restore

## Exports
- `applyFilter(canvas, filterName, value)` → void
- `applyEnhance(canvas)` → void

## Enhancement Pipeline
1. Auto-white balance (gray world algorithm)
2. Contrast enhancement (histogram equalization)
3. Sharpening (unsharp mask)
4. Noise reduction (simple blur on low-contrast areas)

## Dependencies
- Canvas API (built-in)
