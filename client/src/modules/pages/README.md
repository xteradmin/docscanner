# Pages Module

## Purpose

Contains an earlier standalone page-manager component for multi-page documents.

## Components

- `PageManager.jsx`
  Renders a basic page list with remove and reorder buttons.

## Current status

- The active scanner flow no longer uses `PageManager.jsx`.
- Page state, page removal, page reordering, and the document step are currently handled directly inside `ScannerPage.jsx`.
- This module remains in the repository as a legacy helper/reference implementation.
