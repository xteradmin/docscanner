import { useState, useRef } from 'react'

function ImageResizeTool() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [aspectRatio, setAspectRatio] = useState(1)
  const [maintainAspect, setMaintainAspect] = useState(true)
  const inputRef = useRef(null)

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!selected.type.startsWith('image/')) {
      alert('Please select an image file.')
      return
    }
    
    setFile(selected)
    const url = URL.createObjectURL(selected)
    setPreviewUrl(url)

    const img = new Image()
    img.onload = () => {
      setWidth(img.width)
      setHeight(img.height)
      setAspectRatio(img.width / img.height)
    }
    img.src = url
  }

  const clearFile = () => {
    setFile(null)
    setPreviewUrl('')
  }

  const handleWidthChange = (e) => {
    const newWidth = parseInt(e.target.value) || 0
    setWidth(newWidth)
    if (maintainAspect && newWidth > 0) {
      setHeight(Math.round(newWidth / aspectRatio))
    }
  }

  const handleHeightChange = (e) => {
    const newHeight = parseInt(e.target.value) || 0
    setHeight(newHeight)
    if (maintainAspect && newHeight > 0) {
      setWidth(Math.round(newHeight * aspectRatio))
    }
  }

  const handleResize = () => {
    if (!file || !width || !height) return

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `resized_${file.name}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }, file.type)
    }
    img.src = previewUrl
  }

  return (
    <div className="tool-workspace">
      <div className="tool-workspace-header">
        <h2>📐 Resize Image</h2>
        <p>Change the dimensions of your image. Scale it by percentage or set exact width and height.</p>
      </div>

      {!file ? (
        <div className="tool-upload-zone" onClick={() => inputRef.current?.click()}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="tool-file-input"
            onChange={handleFileSelect}
          />
          <div className="tool-upload-content">
            <span className="tool-upload-icon">+</span>
            <strong>Select an image file</strong>
            <span>Choose an image to resize</span>
          </div>
        </div>
      ) : (
        <div className="tool-selected-file" style={{ marginBottom: '1.5rem' }}>
          <div className="file-info">
            <strong>{file.name}</strong>
            <span>{formatSize(file.size)}</span>
          </div>
          <button className="btn-secondary compact" type="button" onClick={clearFile}>Change file</button>
        </div>
      )}

      {file && (
        <div className="tool-info-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="preview-container" style={{ textAlign: 'center' }}>
            <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Width (px)</label>
              <input type="number" value={width} onChange={handleWidthChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Height (px)</label>
              <input type="number" value={height} onChange={handleHeightChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input 
                  type="checkbox" 
                  checked={maintainAspect} 
                  onChange={(e) => setMaintainAspect(e.target.checked)} 
                />
                Maintain Aspect Ratio
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="tool-footer-actions">
        <button
          className="btn-primary"
          type="button"
          onClick={handleResize}
          disabled={!file}
        >
          Download Resized Image
        </button>
      </div>
    </div>
  )
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default ImageResizeTool
