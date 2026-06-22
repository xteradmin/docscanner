import { useState, useRef, useEffect } from 'react'

function CompressTool() {
  const [file, setFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (selected.type !== 'application/pdf') {
      setError('Please select a PDF file.')
      return
    }
    setError('')
    setResult(null)
    setFile(selected)
    if (inputRef.current) inputRef.current.value = ''
  }

  const clearFile = () => {
    setFile(null)
    setError('')
    setResult(null)
  }

  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('') // '', 'uploading', 'processing'
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState('Analyzing structure...')

  // Simulate progress for the backend PDF-lib processing
  useEffect(() => {
    if (phase !== 'processing') {
      setProcessingProgress(0)
      return
    }
    
    let current = 0
    const interval = setInterval(() => {
      current += Math.random() * 3
      if (current > 95) current = 95 // Hang at 95% until actually done
      
      setProcessingProgress(Math.floor(current))
      
      if (current < 30) setProcessingStatus('Analyzing PDF structure...')
      else if (current < 60) setProcessingStatus('Removing redundant objects...')
      else if (current < 85) setProcessingStatus('Optimizing data streams...')
      else setProcessingStatus('Finalizing document...')
      
    }, 500)

    return () => clearInterval(interval)
  }, [phase])

  const handleCompress = () => {
    if (!file) {
      setError('Please upload a PDF file.')
      return
    }

    setProcessing(true)
    setPhase('uploading')
    setProgress(0)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/pdf/compress')
    xhr.responseType = 'blob'

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        setProgress(percent)
        if (percent >= 100) {
          setPhase('processing')
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const originalSize = parseInt(xhr.getResponseHeader('X-Original-Size') || '0', 10)
        const compressedSize = parseInt(xhr.getResponseHeader('X-Compressed-Size') || '0', 10)
        const reduction = parseInt(xhr.getResponseHeader('X-Reduction-Percent') || '0', 10)

        const blob = xhr.response
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `compressed_${Date.now()}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        setResult({ originalSize, compressedSize, reduction })
        setProcessing(false)
        setPhase('')
      } else {
        const reader = new FileReader()
        reader.onload = () => {
          let msg = 'Compression failed'
          try {
            msg = JSON.parse(reader.result).error || msg
          } catch (e) {
            // ignore
          }
          setError(msg)
          setProcessing(false)
          setPhase('')
        }
        reader.readAsText(xhr.response)
      }
    }

    xhr.onerror = () => {
      setError('A network error occurred. Please try again.')
      setProcessing(false)
      setPhase('')
    }

    xhr.send(formData)
  }

  return (
    <div className="tool-workspace">
      <div className="tool-workspace-header">
        <h2>📦 Compress PDF</h2>
        <p>Reduce the file size of your PDF by optimizing its internal structure. Best results on PDFs with redundant data.</p>
      </div>

      {!file ? (
        <div className="tool-upload-zone" onClick={() => inputRef.current?.click()}>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="tool-file-input"
            onChange={handleFileSelect}
          />
          <div className="tool-upload-content">
            <span className="tool-upload-icon">+</span>
            <strong>Select a PDF file</strong>
            <span>Choose a PDF to compress</span>
          </div>
        </div>
      ) : (
        <div className="tool-selected-file">
          <div className="file-info">
            <strong>{file.name}</strong>
            <span>{formatSize(file.size)}</span>
          </div>
          <button className="btn-secondary compact" type="button" onClick={clearFile}>Change file</button>
        </div>
      )}

      {file && !result && (
        <div className="tool-info-card">
          <strong>How compression works</strong>
          <p>
            The server repacks the PDF using optimized object streams, removing redundant data and unused objects.
            Results vary — PDFs with embedded metadata or form fields see the best reductions.
          </p>
        </div>
      )}

      {result && (
        <div className="tool-result-card">
          <div className="result-header">
            <strong>Compression complete</strong>
            <span className={`result-badge ${result.reduction > 0 ? 'positive' : 'neutral'}`}>
              {result.reduction > 0 ? `-${result.reduction}%` : 'No change'}
            </span>
          </div>
          <div className="result-stats">
            <div className="result-stat">
              <span>Original</span>
              <strong>{formatSize(result.originalSize)}</strong>
            </div>
            <span className="result-arrow">→</span>
            <div className="result-stat">
              <span>Compressed</span>
              <strong>{formatSize(result.compressedSize)}</strong>
            </div>
          </div>
          {result.reduction === 0 && (
            <p className="result-note">
              This PDF is already well-optimized. No further structural compression was possible.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="tool-error" role="alert">
          <strong>Error</strong>
          <span>{error}</span>
        </div>
      )}

      {processing && phase === 'processing' && (
        <div className="tool-progress-card" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface-50)', borderRadius: '8px', border: '1px solid var(--surface-200)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong>{processingStatus}</strong>
            <span>{processingProgress}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--surface-200)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${processingProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      <div className="tool-footer-actions">
        <button
          className="btn-primary"
          type="button"
          onClick={handleCompress}
          disabled={processing || !file}
        >
          {processing 
            ? (phase === 'uploading' ? `Uploading... ${progress}%` : 'Compressing PDF...')
            : 'Compress PDF'
          }
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

export default CompressTool
