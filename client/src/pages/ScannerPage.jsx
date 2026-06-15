import { useState, useRef, useEffect, useCallback } from 'react'
import CameraCapture from '../modules/camera/CameraCapture'
import DocumentDetector from '../modules/detection/DocumentDetector'
import PerspectiveTransform from '../modules/perspective/PerspectiveTransform'
import ImageFilters from '../modules/filters/ImageFilters'
import ExportPanel from '../modules/export/ExportPanel'

function ScannerPage() {
  const [step, setStep] = useState('capture')
  const [capturedImage, setCapturedImage] = useState(null)
  const [capturedImageUrl, setCapturedImageUrl] = useState(null)
  const [corners, setCorners] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [processedImageUrl, setProcessedImageUrl] = useState(null)
  const [pages, setPages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeCorner, setActiveCorner] = useState(null)
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 })
  const [showMagnifier, setShowMagnifier] = useState(false)
  const [filterView, setFilterView] = useState('full')
  const imageRef = useRef(null)
  const containerRef = useRef(null)

  const handleCapture = async (blob) => {
    setCapturedImage(blob)
    const url = URL.createObjectURL(blob)
    setCapturedImageUrl(url)
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
    }
    setStep('crop')
    setIsProcessing(false)
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
    try {
      const warped = await PerspectiveTransform.warpPerspective(capturedImage, corners)
      setProcessedImage(warped)
      const url = URL.createObjectURL(warped)
      setProcessedImageUrl(url)
      setStep('filter')
    } catch (err) {
      console.error('Processing failed:', err)
    }
    setIsProcessing(false)
  }

  const applyFilter = async (filterName, value) => {
    if (!processedImage) return
    setIsProcessing(true)
    try {
      const result = await ImageFilters.applyFilter(processedImage, filterName, value)
      if (processedImageUrl) URL.revokeObjectURL(processedImageUrl)
      setProcessedImage(result)
      const url = URL.createObjectURL(result)
      setProcessedImageUrl(url)
    } catch (err) {
      console.error('Filter failed:', err)
    }
    setIsProcessing(false)
  }

  const addToDocument = () => {
    if (!processedImage) return
    setPages(prev => [...prev, { id: Date.now(), image: processedImage }])
    resetAll()
  }

  const downloadSingle = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const resetAll = () => {
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl)
    if (processedImageUrl) URL.revokeObjectURL(processedImageUrl)
    setCapturedImage(null)
    setCapturedImageUrl(null)
    setCorners(null)
    setProcessedImage(null)
    setProcessedImageUrl(null)
    setStep('capture')
    setActiveCorner(null)
    setShowMagnifier(false)
  }

  const removePage = (id) => {
    setPages(prev => prev.filter(p => p.id !== id))
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

  return (
    <div className="scanner-app">
      <div className="top-bar">
        <span className="app-title">DocScanner</span>
      </div>

      {step === 'capture' && (
        <div className="capture-step">
          <CameraCapture onCapture={handleCapture} />
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
            <p>Drag corners to match document</p>
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
                style={{
                  backgroundImage: `url(${capturedImageUrl})`,
                  backgroundPosition: `${corners[activeCorner].x * 100}% ${corners[activeCorner].y * 100}%`,
                  backgroundSize: '300%',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="magnifier-cross"></div>
              </div>
              <div className="magnifier-label">Corner {activeCorner + 1}</div>
            </div>
          )}

          <div className="action-buttons">
            <button className="btn-secondary" onClick={resetAll}>Retake</button>
            <button className="btn-primary" onClick={processCrop} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Crop & Continue'}
            </button>
          </div>
        </div>
      )}

      {step === 'filter' && processedImageUrl && (
        <div className="filter-step">
          <div className="step-header">
            <h2>Enhance</h2>
            <p>Choose preset or adjust</p>
          </div>

          <div className="filter-view-toggle">
            <button 
              className={`view-btn ${filterView === 'full' ? 'active' : ''}`}
              onClick={() => setFilterView('full')}
            >
              Full
            </button>
            <button 
              className={`view-btn ${filterView === 'split' ? 'active' : ''}`}
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
            <div className="filter-group">
              <h3>Quick Presets</h3>
              <div className="preset-grid">
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

            <div className="filter-group">
              <h3>Manual</h3>
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
          </div>

          <div className="quick-download">
            <button className="btn-download" onClick={() => downloadSingle(processedImage, 'document.jpg')}>
              ⬇️ Download JPG
            </button>
          </div>

          <div className="action-buttons">
            <button className="btn-secondary" onClick={() => { setProcessedImage(null); setProcessedImageUrl(null); setStep('crop') }}>Back</button>
            <button className="btn-primary" onClick={addToDocument}>Add to Document</button>
          </div>
        </div>
      )}

      {pages.length > 0 && (
        <div className="pages-section">
          <h2>Document ({pages.length})</h2>
          <div className="pages-grid">
            {pages.map((page, index) => (
              <div key={page.id} className="page-card">
                <img src={URL.createObjectURL(page.image)} alt={`Page ${index + 1}`} />
                <div className="page-actions">
                  <span className="page-number">#{index + 1}</span>
                  {index > 0 && (
                    <button className="page-btn" onClick={() => movePage(index, index - 1)}>↑</button>
                  )}
                  {index < pages.length - 1 && (
                    <button className="page-btn" onClick={() => movePage(index, index + 1)}>↓</button>
                  )}
                  <button className="page-btn delete" onClick={() => removePage(page.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
          <ExportPanel pages={pages} />
        </div>
      )}
    </div>
  )
}

function FilterSlider({ label, min, max, step, defaultValue, onApply }) {
  const [value, setValue] = useState(defaultValue)
  const [applied, setApplied] = useState(false)

  const handleApply = () => {
    onApply(value)
    setApplied(true)
    setTimeout(() => setApplied(false), 800)
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
          onChange={(e) => setValue(parseFloat(e.target.value))}
        />
        <button className={`apply-btn ${applied ? 'applied' : ''}`} onClick={handleApply}>
          {applied ? '✓' : 'Apply'}
        </button>
        {value !== defaultValue && (
          <button className="reset-btn" onClick={handleReset}>×</button>
        )}
      </div>
    </div>
  )
}

export default ScannerPage
