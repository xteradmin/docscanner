import { useState, useRef } from 'react'

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

  const handleCompress = async () => {
    if (!file) {
      setError('Please upload a PDF file.')
      return
    }

    setProcessing(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/pdf/compress', { method: 'POST', body: formData })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Compression failed')
      }

      const originalSize = parseInt(response.headers.get('X-Original-Size') || '0', 10)
      const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0', 10)
      const reduction = parseInt(response.headers.get('X-Reduction-Percent') || '0', 10)

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compressed_${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setResult({ originalSize, compressedSize, reduction })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setProcessing(false)
    }
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

      <div className="tool-footer-actions">
        <button
          className="btn-primary"
          type="button"
          onClick={handleCompress}
          disabled={processing || !file}
        >
          {processing ? 'Compressing...' : 'Compress PDF'}
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
