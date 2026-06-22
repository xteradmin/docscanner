import React, { useState, useRef, useCallback, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

// Async thumbnail component to prevent UI freeze
const Thumbnail = React.memo(({ pdfDoc, pageIndex }) => {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    let active = true
    if (!pdfDoc) return

    pdfDoc.getPage(pageIndex + 1).then(page => {
      const viewport = page.getViewport({ scale: 0.3 }) // smaller scale for faster render
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { alpha: false })
      canvas.width = viewport.width
      canvas.height = viewport.height
      page.render({ canvasContext: context, viewport, intent: 'print' }).promise.then(() => {
        if (active) setSrc(canvas.toDataURL('image/jpeg', 0.6))
      }).catch(err => console.error("Render error", err))
    }).catch(err => console.error("Get page error", err))

    return () => { active = false }
  }, [pdfDoc, pageIndex])

  if (!src) {
    return <div style={{ width: '100%', aspectRatio: '1/1.4', background: '#e0e5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '0.8rem' }}>Loading...</div>
  }
  return <img src={src} alt={`Page ${pageIndex + 1}`} draggable={false} />
})

// Memoized card to prevent React diffing lag during drag-and-drop
const PageCard = React.memo(({ 
  page, 
  index, 
  totalPages,
  pdfDoc,
  onRemove, 
  onPageNumberChange,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}) => {
  return (
    <div 
      className="tool-page-card"
      data-index={index}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="tool-page-info">
        {page.fileName} (Pg {page.pageIndex + 1})
      </div>
      <Thumbnail pdfDoc={pdfDoc} pageIndex={page.pageIndex} />
      
      <div className="tool-page-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#444' }}>
          <label htmlFor={`page-order-${page.id}`} style={{ fontWeight: 600 }}>Pos:</label>
          <select 
            id={`page-order-${page.id}`}
            value={index + 1} 
            onChange={(e) => onPageNumberChange(index, e.target.value)}
            style={{ padding: '2px 4px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
            title="Set page position"
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <option key={i} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </div>
        <button className="file-btn delete" type="button" onClick={() => onRemove(page.id)} aria-label="Remove">×</button>
      </div>
    </div>
  )
})

function CombineTool() {
  const [files, setFiles] = useState([])
  const [pages, setPages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const inputRef = useRef(null)
  const pdfDocsRef = useRef({}) // Store loaded PDF documents

  const handleFileSelect = async (e) => {
    const selected = Array.from(e.target.files || [])
    const pdfs = selected.filter(f => f.type === 'application/pdf')
    if (pdfs.length === 0) {
      setError('Please select PDF files only.')
      return
    }
    setError('')
    setSuccess('')
    setProcessing(true)

    try {
      const newFiles = []
      const newPages = []

      for (const f of pdfs) {
        const fileId = crypto.randomUUID()
        newFiles.push({ file: f, id: fileId })
        
        const arrayBuffer = await f.arrayBuffer()
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        pdfDocsRef.current[fileId] = pdfDoc
        const pageCount = pdfDoc.numPages
        
        for (let i = 1; i <= pageCount; i++) {
          newPages.push({
            id: crypto.randomUUID(),
            fileId,
            fileName: f.name,
            pageIndex: i - 1
          })
        }
      }

      setFiles(prev => [...prev, ...newFiles])
      setPages(prev => [...prev, ...newPages])
    } catch (err) {
      console.error(err)
      setError('Failed to read PDF files.')
    } finally {
      setProcessing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removePage = useCallback((id) => {
    setPages(prev => prev.filter(p => p.id !== id))
    setSuccess('')
  }, [])

  const movePage = useCallback((fromIndex, toIndex) => {
    setPages(prev => {
      const next = [...prev]
      const [removed] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, removed)
      return next
    })
    setSuccess('')
  }, [])

  const handlePageNumberChange = useCallback((currentIndex, val) => {
    const targetIndex = parseInt(val, 10) - 1
    if (currentIndex !== targetIndex && targetIndex >= 0) {
      movePage(currentIndex, targetIndex)
    }
  }, [movePage])

  // Native DOM drag handlers (Zero React Render Lag)
  const handleDragStart = useCallback((e) => {
    const index = e.currentTarget.dataset.index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index)
    // Small timeout ensures the browser captures the drag image before we change its styling
    setTimeout(() => e.target.classList.add('is-dragging'), 0)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    // Calculate if mouse is on the left or right half of the card
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const isLeft = x < rect.width / 2

    e.currentTarget.classList.remove('drop-left', 'drop-right')
    if (isLeft) {
      e.currentTarget.classList.add('drop-left')
    } else {
      e.currentTarget.classList.add('drop-right')
    }
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drop-left', 'drop-right')
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drop-left', 'drop-right')
    
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    let targetIndex = parseInt(e.currentTarget.dataset.index, 10)
    
    if (isNaN(draggedIndex) || isNaN(targetIndex)) return

    // Check if we dropped on the right side
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const isLeft = x < rect.width / 2

    // If dropping on the right side, it means insert AFTER the target
    if (!isLeft) {
      targetIndex += 1
    }
    
    // If dragging an element forward in the list, its original removal will shift everything left by 1
    if (draggedIndex < targetIndex) {
      targetIndex -= 1
    }

    if (draggedIndex !== targetIndex) {
      movePage(draggedIndex, targetIndex)
    }
  }, [movePage])

  const handleDragEnd = useCallback((e) => {
    e.target.classList.remove('is-dragging')
    document.querySelectorAll('.tool-page-card').forEach(el => {
      el.classList.remove('drop-left', 'drop-right')
    })
  }, [])

  const handleMerge = async () => {
    if (pages.length === 0) {
      setError('No pages to combine.')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const referencedFileIds = new Set(pages.map(p => p.fileId))
      const filesToUpload = files.filter(f => referencedFileIds.has(f.id))

      const formData = new FormData()
      filesToUpload.forEach(entry => {
        formData.append('files', entry.file)
      })

      const pageOrder = pages.map(p => {
        const fileIndex = filesToUpload.findIndex(f => f.id === p.fileId)
        return { fileIndex, pageIndex: p.pageIndex }
      })
      formData.append('pageOrder', JSON.stringify(pageOrder))

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

      setSuccess(`Merged ${pages.length} pages successfully!`)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const clearAll = () => {
    setFiles([])
    setPages([])
    setError('')
    setSuccess('')
  }

  return (
    <div className="tool-workspace">
      <style>{`
        .tool-page-card.is-dragging {
          opacity: 0.4;
          cursor: grabbing;
        }
        .tool-page-card.drop-left {
          box-shadow: -4px 0 0 var(--focus);
          transform: translateX(2px);
        }
        .tool-page-card.drop-right {
          box-shadow: 4px 0 0 var(--focus);
          transform: translateX(-2px);
        }
        .tool-page-card {
          cursor: grab;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
      `}</style>
      
      <div className="tool-workspace-header">
        <h2>📎 Combine PDFs</h2>
        <p>Add PDF files and reorder their pages before merging into a single document.</p>
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
          <span>Select PDFs to extract and order pages</span>
        </div>
      </div>

      {pages.length > 0 && (
        <div className="tool-page-grid">
          {pages.map((page, index) => (
            <PageCard
              key={page.id}
              page={page}
              index={index}
              totalPages={pages.length}
              pdfDoc={pdfDocsRef.current[page.fileId]}
              onRemove={removePage}
              onPageNumberChange={handlePageNumberChange}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
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
        {pages.length > 0 && (
          <button className="btn-secondary compact" type="button" onClick={clearAll} disabled={processing}>
            Clear all
          </button>
        )}
        <button
          className="btn-primary"
          type="button"
          onClick={handleMerge}
          disabled={processing || pages.length === 0}
        >
          {processing ? 'Merging...' : `Combine ${pages.length} pages`}
        </button>
      </div>
    </div>
  )
}

export default CombineTool
