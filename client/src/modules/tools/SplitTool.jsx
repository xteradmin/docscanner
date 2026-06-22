import { useState, useRef } from 'react'

const SPLIT_MODES = [
  { id: 'ranges', label: 'Custom ranges', detail: 'e.g. 1-3, 5, 7-9' },
  { id: 'every', label: 'Split every page', detail: 'Each page becomes a separate file' },
  { id: 'extract', label: 'Extract pages', detail: 'Get specific pages only' }
]

function SplitTool() {
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('ranges')
  const [ranges, setRanges] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inputRef = useRef(null)

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (selected.type !== 'application/pdf') {
      setError('Please select a PDF file.')
      return
    }
    setError('')
    setSuccess('')
    setFile(selected)
    if (inputRef.current) inputRef.current.value = ''
  }

  const clearFile = () => {
    setFile(null)
    setError('')
    setSuccess('')
    setRanges('')
  }

  const buildRangesValue = () => {
    if (mode === 'every') return 'each'
    if (mode === 'extract' || mode === 'ranges') return ranges.trim() || 'all'
    return 'all'
  }

  const handleSplit = async () => {
    if (!file) {
      setError('Please upload a PDF file.')
      return
    }
    if ((mode === 'ranges' || mode === 'extract') && !ranges.trim()) {
      setError('Please enter page ranges (e.g. 1-3, 5, 7-9).')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ranges', buildRangesValue())

      const response = await fetch('/api/pdf/split', { method: 'POST', body: formData })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Split failed')
      }

      const contentType = response.headers.get('Content-Type') || ''
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      if (contentType.includes('zip')) {
        a.download = `split_pages_${Date.now()}.zip`
      } else {
        a.download = `split_${Date.now()}.pdf`
      }

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess('Split completed! Check your downloads.')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="tool-workspace">
      <div className="tool-workspace-header">
        <h2>✂️ Split PDF</h2>
        <p>Upload a PDF and choose which pages to extract or how to split it.</p>
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
            <span>Choose a PDF to split into parts</span>
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

      {file && (
        <>
          <div className="tool-mode-selector">
            <label className="tool-label">Split mode</label>
            <div className="tool-mode-options">
              {SPLIT_MODES.map(m => (
                <button
                  key={m.id}
                  className={`mode-btn ${mode === m.id ? 'active' : ''}`}
                  type="button"
                  onClick={() => { setMode(m.id); setSuccess('') }}
                >
                  <strong>{m.label}</strong>
                  <span>{m.detail}</span>
                </button>
              ))}
            </div>
          </div>

          {(mode === 'ranges' || mode === 'extract') && (
            <div className="tool-input-group">
              <label className="tool-label" htmlFor="split-ranges">
                {mode === 'extract' ? 'Pages to extract' : 'Page ranges'}
              </label>
              <input
                id="split-ranges"
                type="text"
                className="tool-text-input"
                placeholder="e.g. 1-3, 5, 7-9"
                value={ranges}
                onChange={(e) => { setRanges(e.target.value); setSuccess('') }}
              />
              <small className="tool-hint">
                Use commas to separate groups. Use dashes for ranges.
              </small>
            </div>
          )}

          {mode === 'every' && (
            <div className="tool-info-card">
              <strong>Split every page</strong>
              <p>Each page in the PDF will become a separate file, packaged into a ZIP download.</p>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="tool-error" role="alert">
          <strong>Error</strong>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="tool-success" role="status">
          <strong>Done</strong>
          <span>{success}</span>
        </div>
      )}

      <div className="tool-footer-actions">
        <button
          className="btn-primary"
          type="button"
          onClick={handleSplit}
          disabled={processing || !file}
        >
          {processing ? 'Splitting...' : 'Split PDF'}
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

export default SplitTool
