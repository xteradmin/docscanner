# Pages Module

## Purpose

Contains an earlier standalone page-manager component for multi-page documents.

## Components

- `PageManager.jsx`
  Renders a basic page list with remove and reorder buttons.

## Current status

- The active scanner flow no longer uses `PageManager.jsx`.
- Page state, page removal, page reordering, workflow progress, user-facing scan notices, and the document review/export step are currently handled directly inside `ScannerPage.jsx`.
- Pages are held in React state for the active browser session only; local IndexedDB draft persistence is not implemented.
- This module remains in the repository as a legacy helper/reference implementation.
