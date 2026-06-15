# Pages Module

## Purpose
Multi-page document management with state persistence.

## Components
- **PageManager.jsx**: Manages multi-page document state
- **PageList.jsx**: Thumbnail list of pages

## Key Features
- Add/remove/reorder pages
- Auto-saves to IndexedDB every 30s
- State includes: original image, processed image, corners, filters, order

## State Structure
```javascript
{
  pages: [
    { id, originalImage, processedImage, corners, filters, order }
  ],
  activePage: 0
}
```

## Exports
- `usePages()` hook returning `{pages, addPage, removePage, reorder}`

## Dependencies
- `idb` (IndexedDB wrapper)
