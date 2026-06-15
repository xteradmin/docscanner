# Perspective Module

## Purpose

Flattens a four-corner document selection into a cropped rectangle.

## Runtime surface

- `PerspectiveTransform.warpPerspective(imageBlob, corners)`
  Returns a JPEG `Blob` produced from the selected four-corner region.

## Implemented behavior

- Converts normalized corner coordinates into source-image pixel coordinates.
- Derives output width and height from the longest opposing document edges.
- Computes a perspective transform matrix in pure JavaScript.
- Samples pixels into the destination canvas with bilinear interpolation.
- Returns the warped result as a JPEG blob.

## Notes

- The output size is based on the current document geometry, not a fixed A4 template.
- The module rejects invalid or unreadable source images instead of silently failing.
