import { useState, useRef, useCallback, useEffect } from 'react'

function CameraCapture({ onCapture }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not available in this browser. Upload an image instead.')
      return
    }

    try {
      stopCamera()
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      setError('Camera access denied. Upload an image or allow camera permissions.')
    }
  }, [stopCamera])

  useEffect(() => {
    startCamera()
    return stopCamera
  }, [startCamera, stopCamera])

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob)
    }, 'image/jpeg', 0.95)
  }

  if (error) {
    return (
      <div className="camera-error">
        <div className="error-icon">CAM</div>
        <p>{error}</p>
        <button className="btn-secondary compact" type="button" onClick={startCamera}>Try again</button>
      </div>
    )
  }

  return (
    <div className="camera-container">
      <div className="camera-label">Camera</div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-video"
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <button className="capture-btn" type="button" aria-label="Capture photo" onClick={capture}>
        <div className="capture-btn-inner"></div>
      </button>
    </div>
  )
}

export default CameraCapture
