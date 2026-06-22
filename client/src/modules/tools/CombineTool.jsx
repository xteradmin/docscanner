import { useState, useRef } from 'react'

function CombineTool() {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inputRef = useRef(null)

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || [])
    const pdfs = selected.filter(f => f.type === 'application/pdf')
    if (pdfs.length === 0) {
      setError('Please select PDF files only.')
      return
    }
    setError('')
    setSuccess('')
    setFiles(prev => [...prev, ...pdfs.map(f => ({ file: f, id: crypto.randomUUID() }))])
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    setSuccess('')
  }

  const moveFile = (fromIndex, toIndex) => {
    setFiles(prev => {
      const next = [...prev]
      const [removed] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, removed)
      return next
    })
    setSuccess('')
  }

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to combine.')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      files.forEach(entry => {
        formData.append('files', entry.file)
      })

      const response = await fetch('/api/pdf/merge', { method: 'POST', body: formData })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Merge failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `merged_${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess(`Merged ${files.length} files successfully!`)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const clearAll = () => {
    setFiles([])
    setError('')
    setSuccess('')
  }

  return (
    <div className="tool-workspace">
      <div className="tool-workspace-header">
        <h2>📎 Combine PDFs</h2>
        <p>Add two or more PDF files and reorder them before merging into a single document.</p>
      </div>

      <div className="tool-upload-zone" onClick={() => inputRef.current?.click()}>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="tool-file-input"
          onChange={handleFileSelect}
        />
        <div className="tool-upload-content">
          <span className="tool-upload-icon">+</span>
          <strong>Add PDF files</strong>
          <span>Select two or more PDFs to combine</span>
        </div>
      </div>

      {files.length > 0 && (
        <div className="tool-file-list">
          {files.map((entry, index) => (
            <div key={entry.id} className="tool-file-row">
              <span className="file-order">{index + 1}</span>
              <div className="file-info">
                <strong>{entry.file.name}</strong>
                <span>{formatSize(entry.file.size)}</span>
              </div>
              <div className="file-actions">
                {index > 0 && (
                  <button className="file-btn" type="button" onClick={() => moveFile(index, index - 1)} aria-label="Move up">↑</button>
                )}
                {index < files.length - 1 && (
                  <button className="file-btn" type="button" onClick={() => moveFile(index, index + 1)} aria-label="Move down">↓</button>
                )}
                <button className="file-btn delete" type="button" onClick={() => removeFile(entry.id)} aria-label="Remove">×</button>
              </div>
            </div>
          ))}
        </div>
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
        {files.length > 0 && (
          <button className="btn-secondary compact" type="button" onClick={clearAll} disabled={processing}>
            Clear all
          </button>
        )}
        <button
          className="btn-primary"
          type="button"
          onClick={handleMerge}
          disabled={processing || files.length < 2}
        >
          {processing ? 'Merging...' : `Combine ${files.length} files`}
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

export default CombineTool
