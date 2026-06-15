import { useState } from 'react'
import CameraCapture from '../modules/camera/CameraCapture'
import DocumentDetector from '../modules/detection/DocumentDetector'
import PerspectiveTransform from '../modules/perspective/PerspectiveTransform'
import ImageFilters from '../modules/filters/ImageFilters'
import PageManager from '../modules/pages/PageManager'
import ExportPanel from '../modules/export/ExportPanel'

function ScannerPage() {
  const [capturedImage, setCapturedImage] = useState(null)
  const [detectedCorners, setDetectedCorners] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [pages, setPages] = useState([])

  const handleCapture = async (blob) => {
    setCapturedImage(blob)
    const corners = await DocumentDetector.detectDocument(blob)
    setDetectedCorners(corners)
  }

  const handleProcess = async () => {
    if (capturedImage && detectedCorners) {
      const warped = await PerspectiveTransform.warpPerspective(capturedImage, detectedCorners)
      const enhanced = await ImageFilters.applyEnhance(warped)
      setProcessedImage(enhanced)
    }
  }

  const handleAddPage = () => {
    if (processedImage) {
      setPages([...pages, { id: Date.now(), image: processedImage }])
      setCapturedImage(null)
      setDetectedCorners(null)
      setProcessedImage(null)
    }
  }

  return (
    <div className="scanner-page">
      <h2>Scanner</h2>
      
      {!capturedImage && (
        <CameraCapture onCapture={handleCapture} />
      )}
      
      {capturedImage && !processedImage && (
        <div className="card">
          <h3>Captured Image</h3>
          <img src={URL.createObjectURL(capturedImage)} alt="Captured" style={{ maxWidth: '100%' }} />
          {detectedCorners && (
            <div>
              <p>Document detected! Corners found.</p>
              <button onClick={handleProcess}>Process Image</button>
            </div>
          )}
          <button onClick={() => setCapturedImage(null)}>Retake</button>
        </div>
      )}
      
      {processedImage && (
        <div className="card">
          <h3>Processed Image</h3>
          <img src={URL.createObjectURL(processedImage)} alt="Processed" style={{ maxWidth: '100%' }} />
          <button onClick={handleAddPage}>Add to Document</button>
          <button onClick={() => setProcessedImage(null)}>Edit</button>
        </div>
      )}
      
      <PageManager pages={pages} setPages={setPages} />
      
      {pages.length > 0 && (
        <ExportPanel pages={pages} />
      )}
    </div>
  )
}

export default ScannerPage
