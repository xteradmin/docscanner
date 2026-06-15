# Detection Module

## Purpose

Detects the four document corners from an input image before manual adjustment.

## Runtime surface

- `DocumentDetector.detectDocument(imageBlob)`
  Loads the image into a canvas, runs the edge-detection pipeline, and resolves an ordered four-corner result in normalized `0..1` coordinates.

## Implemented behavior

- Converts the image to grayscale.
- Runs a simple gradient-based edge pass.
- Traces contours from the edge map.
- Chooses the largest plausible rectangular contour.
- Reorders the detected points into top-left, top-right, bottom-right, bottom-left order.
- Falls back to a padded full-frame rectangle when no document contour is found.

## Notes

- This is a custom Canvas-based implementation. It does not use OpenCV or an external vision library.
- The scanner UI still allows manual corner dragging after detection.
