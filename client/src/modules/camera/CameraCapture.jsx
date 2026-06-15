import { useRef, useCallback } from 'react'
import Webcam from 'react-webcam'

function CameraCapture({ onCapture }) {
  const webcamRef = useRef(null)

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot()
    if (imageSrc) {
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => onCapture(blob))
    }
  }, [onCapture])

  return (
    <div className="camera-capture">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }}
        style={{ width: '100%', maxWidth: '640px' }}
      />
      <button onClick={capture}>Capture</button>
    </div>
  )
}

export default CameraCapture
