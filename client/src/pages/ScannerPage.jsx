import { useState, useRef, useEffect, useCallback } from 'react'
import CameraCapture from '../modules/camera/CameraCapture'
import ImageUpload from '../modules/camera/ImageUpload'
import DocumentDetector from '../modules/detection/DocumentDetector'
import PerspectiveTransform from '../modules/perspective/PerspectiveTransform'
import ImageFilters from '../modules/filters/ImageFilters'
import ExportPanel from '../modules/export/ExportPanel'

const MAGNIFIER_ZOOM = 3
const WORKFLOW_STEPS = [
  { id: 'capture', label: 'Capture' },
  { id: 'crop', label: 'Crop' },
  { id: 'filter', label: 'Enhance' },
  { id: 'document', label: 'Export' }
]

function ScannerPage() {
  const [step, setStep] = useState('capture')
  const [capturedImage, setCapturedImage] = useState(null)
  const [capturedImageUrl, setCapturedImageUrl] = useState(null)
  const [corners, setCorners] = useState(null)
  const [filterSourceImage, setFilterSourceImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [processedImageUrl, setProcessedImageUrl] = useState(null)
  const [pages, setPages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeCorner, setActiveCorner] = useState(null)
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 })
  const [showMagnifier, setShowMagnifier] = useState(false)
  const [filterView, setFilterView] = useState('full')
  const [filterControlsTab, setFilterControlsTab] = useState('presets')
  const [scanNotice, setScanNotice] = useState(null)
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const filterRequestId = useRef(0)
  const activeStepIndex = Math.max(0, WORKFLOW_STEPS.findIndex(item => item.id === step))
  const pageLabel = `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`

  const handleCapture = async (blob) => {
    if (!blob) {
      setScanNotice({
        type: 'error',
        title: 'No image received',
        message: 'Try capturing the page again or upload a document photo.'
      })
      return
    }

    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl)
    if (processedImageUrl) URL.revokeObjectURL(processedImageUrl)

    setScanNotice(null)
    setCapturedImage(blob)
    const url = URL.createObjectURL(blob)
    setCapturedImageUrl(url)
    setFilterSourceImage(null)
    setProcessedImage(null)
    setProcessedImageUrl(null)
    setIsProcessing(true)
    try {
      const detectedCorners = await DocumentDetector.detectDocument(blob)
      setCorners(detectedCorners)
    } catch (err) {
      setCorners([
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 }
      ])
      setScanNotice({
        type: 'warning',
        title: 'Edges need manual review',
        message: 'We could not detect the document edges automatically. Adjust the corners before continuing.'
      })
    } finally {
      setStep('crop')
      setIsProcessing(false)
    }
  }

  const getRelativePosition = useCallback((clientX, clientY) => {
    if (!imageRef.current) return null
    const rect = imageRef.current.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
      clientX,
      clientY
    }
  }, [])

  const handlePointerDown = useCallback((index, e) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveCorner(index)
    setShowMagnifier(true)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setMagnifierPos({ x: clientX, y: clientY })
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (activeCorner === null) return
    e.preventDefault()
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    const pos = getRelativePosition(clientX, clientY)
    if (!pos) return

    setCorners(prev => {
      const newCorners = [...prev]
      newCorners[activeCorner] = { x: pos.x, y: pos.y }
      return newCorners
    })

    setMagnifierPos({ x: clientX, y: clientY })

    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const relativeY = clientY - containerRect.top
      if (relativeY > containerRect.height - 80) {
        containerRef.current.scrollBy({ top: 15, behavior: 'auto' })
      } else if (relativeY < 80) {
        containerRef.current.scrollBy({ top: -15, behavior: 'auto' })
      }
    }
  }, [activeCorner, getRelativePosition])

  const handlePointerUp = useCallback(() => {
    setActiveCorner(null)
    setShowMagnifier(false)
  }, [])

  useEffect(() => {
    if (activeCorner !== null) {
      const handleMove = (e) => handlePointerMove(e)
      const handleUp = () => handlePointerUp()
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
      window.addEventListener('touchmove', handleMove, { passive: false })
      window.addEventListener('touchend', handleUp)
      return () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
        window.removeEventListener('touchmove', handleMove)
        window.removeEventListener('touchend', handleUp)
      }
    }
  }, [activeCorner, handlePointerMove, handlePointerUp])

  const processCrop = async () => {
    if (!capturedImage || !corners) return
    setIsProcessing(true)
    setScanNotice(null)
    try {
      const warped = await PerspectiveTransform.warpPerspective(capturedImage, corners)
      setFilterSourceImage(warped)
      setProcessedImage(warped)
      const url = URL.createObjectURL(warped)
      setProcessedImageUrl(url)
      setFilterControlsTab('presets')
      setStep('filter')
    } catch (err) {
      console.error('Crop failed:', err)
      setScanNotice({
        type: 'error',
        title: 'Could not crop this page',
        message: 'Move the corners fully inside the image and try again. If the photo is very large, use a smaller image.'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const applyFilter = async (filterName, value) => {
    if (!filterSourceImage) return
    const requestId = filterRequestId.current + 1
    filterRequestId.current = requestId
    setIsProcessing(true)
    setScanNotice(null)
    try {
      const result = await ImageFilters.applyFilter(filterSourceImage, filterName, value)
      if (requestId !== filterRequestId.current) {
        return
      }
      if (processedImageUrl) URL.revokeObjectURL(processedImageUrl)
      setProcessedImage(result)
      const url = URL.createObjectURL(result)
      setProcessedImageUrl(url)
    } catch (err) {
      console.error('Filter failed:', err)
      if (requestId === filterRequestId.current) {
        setScanNotice({
          type: 'error',
          title: 'Enhancement failed',
          message: 'The original crop is still available. Try a different preset or add the page without extra filters.'
        })
      }
    } finally {
      if (requestId === filterRequestId.current) {
        setIsProcessing(false)
      }
    }
  }

  const resetFilters = () => {
    if (!filterSourceImage) return
    filterRequestId.current += 1
    setScanNotice(null)
    if (processedImageUrl) URL.revokeObjectURL(processedImageUrl)
    setProcessedImage(filterSourceImage)
    setProcessedImageUrl(URL.createObjectURL(filterSourceImage))
  }

  const goBackToCrop = () => {
    filterRequestId.current += 1
    setScanNotice(null)
    if (processedImageUrl) URL.revokeObjectURL(processedImageUrl)
    setFilterSourceImage(null)
    setProcessedImage(null)
    setProcessedImageUrl(null)
    setStep('crop')
  }

  const clearCurrentScan = () => {
    filterRequestId.current += 1
    setScanNotice(null)
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl)
    if (processedImageUrl) URL.revokeObjectURL(processedImageUrl)
    setCapturedImage(null)
    setCapturedImageUrl(null)
    setCorners(null)
    setFilterSourceImage(null)
    setProcessedImage(null)
    setProcessedImageUrl(null)
    setActiveCorner(null)
    setShowMagnifier(false)
  }

  const resetAll = () => {
    clearCurrentScan()
    setStep('capture')
  }

  const addToDocument = () => {
    if (!processedImage) return
    setPages(prev => [...prev, { id: Date.now(), image: processedImage }])
    clearCurrentScan()
    setStep('document')
  }

  const addAnotherImage = () => {
    clearCurrentScan()
    setStep('capture')
  }

  const startNewDocument = () => {
    clearCurrentScan()
    setPages([])
    setStep('capture')
  }

  const removePage = (id) => {
    setPages(prev => {
      const nextPages = prev.filter(p => p.id !== id)
      if (nextPages.length === 0) setStep('capture')
      return nextPages
    })
  }

  const movePage = (fromIndex, toIndex) => {
    setPages(prev => {
      const newPages = [...prev]
      const [removed] = newPages.splice(fromIndex, 1)
      newPages.splice(toIndex, 0, removed)
      return newPages
    })
  }

  const getMagnifierPosition = () => {
    const screenWidth = window.innerWidth
    const isRightSide = magnifierPos.x > screenWidth / 2
    
    return {
      x: isRightSide ? magnifierPos.x - 170 : magnifierPos.x + 20,
      y: magnifierPos.y - 90
    }
  }

  const getMagnifierLensStyle = () => {
    const corner = corners?.[activeCorner]
    const imageRect = imageRef.current?.getBoundingClientRect()

    if (!capturedImageUrl || !corner || !imageRect) {
      return {}
    }

    const backgroundWidth = imageRect.width * MAGNIFIER_ZOOM
    const backgroundHeight = imageRect.height * MAGNIFIER_ZOOM
    const focusX = corner.x * backgroundWidth
    const focusY = corner.y * backgroundHeight

    return {
      backgroundImage: `url(${capturedImageUrl})`,
      backgroundPosition: `calc(var(--magnifier-size) / 2 - ${focusX}px) calc(var(--magnifier-size) / 2 - ${focusY}px)`,
      backgroundSize: `${backgroundWidth}px ${backgroundHeight}px`,
      backgroundRepeat: 'no-repeat'
    }
  }

  return (
    <div className="scanner-app">
      <header className="top-bar">
        <div className="brand-block">
          <span className="app-kicker">Document scanner</span>
          <h1 className="app-title">DocScanner</h1>
        </div>
        <div className="document-chip" aria-live="polite">
          <span>Current document</span>
          <strong>{pageLabel}</strong>
        </div>
      </header>

      <nav className="workflow-steps" aria-label="Scan progress">
        {WORKFLOW_STEPS.map((item, index) => (
          <div
            key={item.id}
            className={`workflow-step ${index === activeStepIndex ? 'active' : ''} ${index < activeStepIndex ? 'complete' : ''}`}
          >
            <span className="workflow-index">{index + 1}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      {scanNotice && (
        <ScanNotice notice={scanNotice} onDismiss={() => setScanNotice(null)} />
      )}

      {step === 'capture' && (
        <div className="capture-step">
          <div className="capture-intro">
            <div>
              <h2>Start a scan</h2>
              <p>Use the camera or choose an image from your device.</p>
            </div>
            {pages.length > 0 && (
              <button className="btn-secondary compact" type="button" onClick={() => setStep('document')}>
                Review {pageLabel}
              </button>
            )}
          </div>
          <div className="capture-grid">
            <CameraCapture onCapture={handleCapture} />
            <ImageUpload onCapture={handleCapture} disabled={isProcessing} />
          </div>
          {isProcessing && (
            <div className="processing-overlay">
              <div className="spinner"></div>
              <p>Detecting...</p>
            </div>
          )}
        </div>
      )}

      {step === 'crop' && capturedImageUrl && corners && (
        <div className="crop-step" ref={containerRef}>
          <div className="step-header">
            <h2>Adjust Edges</h2>
            <p>Place each corner on the page boundary.</p>
          </div>

          <div className="crop-editor">
            <div className="image-wrapper">
              <img
                ref={imageRef}
                src={capturedImageUrl}
                alt="Captured"
                className="crop-image"
                draggable={false}
              />
              <svg className="corner-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polygon
                  points={corners.map(c => `${c.x * 100},${c.y * 100}`).join(' ')}
                  fill="rgba(37, 99, 235, 0.15)"
                  stroke="#2563eb"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
              </svg>
              {corners.map((corner, index) => (
                <div
                  key={index}
                  className={`corner-handle corner-${index} ${activeCorner === index ? 'active' : ''}`}
                  style={{ left: `${corner.x * 100}%`, top: `${corner.y * 100}%` }}
                  onMouseDown={(e) => handlePointerDown(index, e)}
                  onTouchStart={(e) => handlePointerDown(index, e)}
                >
                  <div className="handle-ring"></div>
                  <div className="handle-dot"></div>
                </div>
              ))}
            </div>
          </div>

          {showMagnifier && activeCorner !== null && (
            <div
              className="magnifier"
              style={{
                left: `${getMagnifierPosition().x}px`,
                top: `${getMagnifierPosition().y}px`
              }}
            >
              <div
                className="magnifier-lens"
                style={getMagnifierLensStyle()}
              >
                <div className="magnifier-cross"></div>
              </div>
              <div className="magnifier-label">Corner {activeCorner + 1}</div>
            </div>
          )}

          <div className="action-buttons">
            <button className="btn-secondary" type="button" onClick={resetAll}>Retake</button>
            <button className="btn-primary" type="button" onClick={processCrop} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Crop & Continue'}
            </button>
          </div>
        </div>
      )}

      {step === 'filter' && processedImageUrl && (
        <div className="filter-step">
          <div className="step-header">
            <h2>Enhance Page</h2>
            <p>Review the crop and choose a clean finish.</p>
          </div>

          <div className="filter-view-toggle">
            <button 
              className={`view-btn ${filterView === 'full' ? 'active' : ''}`}
              type="button"
              onClick={() => setFilterView('full')}
            >
              Full
            </button>
            <button 
              className={`view-btn ${filterView === 'split' ? 'active' : ''}`}
              type="button"
              onClick={() => setFilterView('split')}
            >
              Compare
            </button>
          </div>

          <div className={`filter-preview ${filterView}`}>
            {filterView === 'full' && (
              <img src={processedImageUrl} alt="Processed" className="full-image" />
            )}
            {filterView === 'split' && (
              <div className="split-container">
                <div className="split-pane">
                  <img src={capturedImageUrl} alt="Original" />
                  <span className="split-label">Original</span>
                </div>
                <div className="split-divider"></div>
                <div className="split-pane">
                  <img src={processedImageUrl} alt="Processed" />
                  <span className="split-label">Processed</span>
                </div>
              </div>
            )}
          </div>

          <div className="filter-controls">
            <div className="filter-tabs" role="tablist" aria-label="Filter controls">
              <button
                className={`filter-tab ${filterControlsTab === 'presets' ? 'active' : ''}`}
                type="button"
                role="tab"
                aria-selected={filterControlsTab === 'presets'}
                onClick={() => setFilterControlsTab('presets')}
              >
                Presets
              </button>
              <button
                className={`filter-tab ${filterControlsTab === 'manual' ? 'active' : ''}`}
                type="button"
                role="tab"
                aria-selected={filterControlsTab === 'manual'}
                onClick={() => setFilterControlsTab('manual')}
              >
                Manual
              </button>
            </div>

            {filterControlsTab === 'presets' && (
              <div className="filter-group" role="tabpanel">
                <div className="preset-grid">
                <button className="preset-btn" onClick={resetFilters}>
                  <span className="preset-icon">1:1</span>
                  <span className="preset-name">Original</span>
                </button>
                <button className="preset-btn" onClick={() => applyFilter('enhance', 1)}>
                  <span className="preset-icon">✨</span>
                  <span className="preset-name">Auto</span>
                </button>
                <button className="preset-btn" onClick={() => applyFilter('brightness', 1.3)}>
                  <span className="preset-icon">☀️</span>
                  <span className="preset-name">Bright</span>
                </button>
                <button className="preset-btn" onClick={() => applyFilter('contrast', 1.3)}>
                  <span className="preset-icon">◐</span>
                  <span className="preset-name">Contrast</span>
                </button>
                <button className="preset-btn" onClick={() => applyFilter('grayscale', 1)}>
                  <span className="preset-icon">⬛</span>
                  <span className="preset-name">Gray</span>
                </button>
                <button className="preset-btn" onClick={() => applyFilter('sharpen', 0.5)}>
                  <span className="preset-icon">🔍</span>
                  <span className="preset-name">Sharp</span>
                </button>
                <button className="preset-btn" onClick={() => applyFilter('saturation', 1.5)}>
                  <span className="preset-icon">🎨</span>
                  <span className="preset-name">Vivid</span>
                </button>
                </div>
              </div>
            )}

            {filterControlsTab === 'manual' && (
              <div className="filter-group" role="tabpanel">
                <FilterSlider
                  label="Brightness"
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  defaultValue={1}
                  onApply={(v) => applyFilter('brightness', v)}
                />
                <FilterSlider
                  label="Contrast"
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  defaultValue={1}
                  onApply={(v) => applyFilter('contrast', v)}
                />
                <FilterSlider
                  label="Saturation"
                  min={0}
                  max={2}
                  step={0.01}
                  defaultValue={1}
                  onApply={(v) => applyFilter('saturation', v)}
                />
                <FilterSlider
                  label="Sharpen"
                  min={0}
                  max={1}
                  step={0.01}
                  defaultValue={0}
                  onApply={(v) => applyFilter('sharpen', v)}
                />
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button className="btn-secondary" type="button" onClick={goBackToCrop}>Back</button>
            <button className="btn-primary" type="button" onClick={addToDocument}>Add page to document</button>
          </div>
        </div>
      )}

      {step === 'document' && pages.length > 0 && (
        <div className="document-step">
          <div className="document-header">
            <div>
              <span className="section-eyebrow">Ready to export</span>
              <h2>Review Document</h2>
              <p>{pageLabel} ready</p>
            </div>
            <button className="btn-secondary document-add-btn" type="button" onClick={addAnotherImage}>
              Add another image
            </button>
          </div>
          <div className="pages-grid">
            {pages.map((page, index) => (
              <div key={page.id} className="page-card">
                <PageThumbnail image={page.image} alt={`Page ${index + 1}`} />
                <div className="page-actions">
                  <span className="page-number">#{index + 1}</span>
                  {index > 0 && (
                    <button className="page-btn" type="button" aria-label={`Move page ${index + 1} up`} onClick={() => movePage(index, index - 1)}>↑</button>
                  )}
                  {index < pages.length - 1 && (
                    <button className="page-btn" type="button" aria-label={`Move page ${index + 1} down`} onClick={() => movePage(index, index + 1)}>↓</button>
                  )}
                  <button className="page-btn delete" type="button" aria-label={`Remove page ${index + 1}`} onClick={() => removePage(page.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
          <ExportPanel pages={pages} />
          <div className="document-actions">
            <button className="btn-secondary" type="button" onClick={startNewDocument}>Start new document</button>
            <button className="btn-primary" type="button" onClick={addAnotherImage}>Add another image</button>
          </div>
        </div>
      )}
    </div>
  )
}

function PageThumbnail({ image, alt }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(image)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [image])

  return url ? <img src={url} alt={alt} /> : null
}

function ScanNotice({ notice, onDismiss }) {
  return (
    <div className={`scan-notice ${notice.type}`} role="status" aria-live="polite">
      <div>
        <strong>{notice.title}</strong>
        <p>{notice.message}</p>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notice">×</button>
    </div>
  )
}

function FilterSlider({ label, min, max, step, defaultValue, onApply }) {
  const [value, setValue] = useState(defaultValue)

  const handleChange = (nextValue) => {
    setValue(nextValue)
    onApply(nextValue)
  }

  const handleReset = () => {
    setValue(defaultValue)
    onApply(defaultValue)
  }

  return (
    <div className="filter-slider">
      <div className="slider-header">
        <label>{label}</label>
        <span className="slider-value">{Math.round(((value - min) / (max - min)) * 100)}%</span>
      </div>
      <div className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
        />
        {value !== defaultValue && (
          <button className="reset-btn" onClick={handleReset}>×</button>
        )}
      </div>
    </div>
  )
}

export default ScannerPage
