# Camera Module

## Purpose

Provides the two current scan entry points: live camera capture and local image upload.

## Components

- `CameraCapture.jsx`
  Captures a frame from the user's camera and returns it as a JPEG `Blob`.

- `ImageUpload.jsx`
  Accepts an image from the file picker or drag and drop and forwards it into the same scan pipeline used by camera capture.

## Implemented behavior

- Uses `navigator.mediaDevices.getUserMedia()` directly.
- Prefers the environment-facing camera on mobile devices.
- Stops active media tracks on restart and unmount.
- Shows a camera error state when access is denied or unavailable.
- Accepts only `image/*` uploads.
- Rejects uploaded images larger than 25 MB before they enter the scan pipeline.
- Supports drag and drop plus manual file selection.
- Ignores drag and drop while a scan is already processing.
- Calls the shared `onCapture(fileOrBlob)` callback for both sources.

## Notes

- The module does not perform any document detection itself.
- Upload is the fallback path when camera access is unavailable.
