# Camera Module

## Purpose
Handles camera access and photo capture for document scanning.

## Components
- **CameraCapture.jsx**: Main camera component with responsive layout
  - Mobile: Full-screen camera view with capture button
  - Desktop: Camera preview in a card/modal

## Key Features
- Uses `react-webcam` for camera access
- Automatically requests rear camera on mobile (`facingMode: 'environment'`)
- Falls back to front camera if rear unavailable
- Captures photos as JPEG blobs (quality 0.92)

## Exports
- `CameraCapture` component
- `capturePhoto()` method

## Dependencies
- `react-webcam`

## Usage
```jsx
import CameraCapture from './CameraCapture';

<CameraCapture onCapture={(blob) => handlePhoto(blob)} />
```
