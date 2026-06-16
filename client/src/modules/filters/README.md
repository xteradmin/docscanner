# Filters Module

## Purpose

Applies visual cleanup and enhancement operations to the cropped scan image.

## Runtime surface

- `ImageFilters.applyFilter(imageBlob, filterName, value = 1)`
  Applies the selected filter and resolves a new JPEG blob.

## Implemented filters

- `brightness`
- `contrast`
- `saturation`
- `sharpen`
- `denoise`
- `grayscale`
- `enhance`

## Implemented behavior

- Uses the Canvas API for all pixel operations.
- Supports automatic enhancement through `autoContrast`, `sharpen`, and `autoWhiteBalance`.
- Treats `sharpen` value `0` as a no-op.
- Returns a new JPEG blob for each filter request.
- Rejects invalid source images instead of hanging.

## Scanner flow notes

- The scanner page keeps an original cropped image and always applies new filters from that source image.
- Manual sliders auto-apply as they move.
- Rapid slider changes are guarded so older async filter results do not overwrite newer ones.
- Filter failures are shown in the scanner UI while preserving the original cropped image, so the user can retry or add the page without extra enhancement.
