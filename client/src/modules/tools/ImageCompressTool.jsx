import { useState, useRef, useEffect } from 'react'

function ImageCompressTool() {
  const [file, setFile] = useState(null)
  const [originalUrl, setOriginalUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [quality, setQuality] = useState(80) // 1-100
  const [format, setFormat] = useState('image/jpeg')
  const [compressedSize, setCompressedSize] = useState(null)
  const [isProcessingPreview, setIsProcessingPreview] = useState(false)
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
    setOriginalUrl(url)
    setPreviewUrl(url)
    setCompressedSize(selected.size)
  }

  const clearFile = () => {
    setFile(null)
    setOriginalUrl('')
    setPreviewUrl('')
    setCompressedSize(null)
  }

  useEffect(() => {
    if (!file || !originalUrl) return;

    setIsProcessingPreview(true);
    // Debounce the canvas operations so sliding the bar is smooth
    const timer = setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const compressionQuality = quality / 100;
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setCompressedSize(blob.size);
          }
          setIsProcessingPreview(false);
        }, format, compressionQuality);
      };
      img.src = originalUrl;
    }, 150);

    return () => clearTimeout(timer);
  }, [file, originalUrl, quality, format]);

  const handleCompress = () => {
    if (!previewUrl || !file) return
    
    const a = document.createElement('a')
    a.href = previewUrl
    const ext = format === 'image/jpeg' ? 'jpg' : 'webp'
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    a.download = `compressed_${baseName}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="tool-workspace">
      <div className="tool-workspace-header">
        <h2>📉 Compress Image</h2>
        <p>Reduce image file size by adjusting its quality, making it easier to share or upload.</p>
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
            <span>Choose an image to compress</span>
          </div>
        </div>
      ) : (
        <div className="tool-selected-file" style={{ marginBottom: '1.5rem' }}>
          <div className="file-info">
            <strong>{file.name}</strong>
            <span>Original: {formatSize(file.size)}</span>
          </div>
          <button className="btn-secondary compact" type="button" onClick={clearFile}>Change file</button>
        </div>
      )}

      {file && (
        <div className="tool-info-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="preview-container" style={{ textAlign: 'center', position: 'relative' }}>
            <img 
              src={previewUrl} 
              alt="Preview" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '300px', 
                objectFit: 'contain', 
                borderRadius: '4px',
                opacity: isProcessingPreview ? 0.5 : 1,
                transition: 'opacity 0.2s ease'
              }} 
            />
            {isProcessingPreview && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                Processing...
              </div>
            )}
            {compressedSize && (
              <div style={{ marginTop: '0.5rem', fontWeight: 500, color: 'var(--primary)' }}>
                Estimated output size: {formatSize(compressedSize)} 
                {compressedSize < file.size && ` (-${Math.round((1 - compressedSize / file.size) * 100)}%)`}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Quality</label>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>{quality}%</span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button 
                  type="button" 
                  className={`btn-secondary compact ${quality === 95 ? 'active' : ''}`} 
                  onClick={() => setQuality(95)}
                  style={{ flex: 1, fontSize: '0.75rem', padding: '0.25rem' }}
                >
                  Best (95%)
                </button>
                <button 
                  type="button" 
                  className={`btn-secondary compact ${quality === 80 ? 'active' : ''}`} 
                  onClick={() => setQuality(80)}
                  style={{ flex: 1, fontSize: '0.75rem', padding: '0.25rem' }}
                >
                  Optimal (80%)
                </button>
                <button 
                  type="button" 
                  className={`btn-secondary compact ${quality === 40 ? 'active' : ''}`} 
                  onClick={() => setQuality(40)}
                  style={{ flex: 1, fontSize: '0.75rem', padding: '0.25rem' }}
                >
                  Lowest (40%)
                </button>
              </div>

              <input 
                type="range" 
                min="1" 
                max="100" 
                value={quality} 
                onChange={(e) => setQuality(parseInt(e.target.value))} 
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
            
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Target Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface-50)' }}>
                <option value="image/jpeg">JPEG</option>
                <option value="image/webp">WebP</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="tool-footer-actions">
        <button
          className="btn-primary"
          type="button"
          onClick={handleCompress}
          disabled={!file || isProcessingPreview}
        >
          Download Compressed Image
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

export default ImageCompressTool
