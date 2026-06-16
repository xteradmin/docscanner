import { useState } from 'react'
import jsPDF from 'jspdf'

const EXPORT_FORMATS = [
  {
    id: 'pdf',
    label: 'PDF',
    title: 'Single PDF',
    detail: 'Best for sharing or printing',
    output: '1 file'
  },
  {
    id: 'jpg',
    label: 'JPG',
    title: 'JPG pages',
    detail: 'Smaller image files',
    output: 'One file per page'
  },
  {
    id: 'png',
    label: 'PNG',
    title: 'PNG pages',
    detail: 'Higher image fidelity',
    output: 'One file per page'
  }
]

function ExportPanel({ pages }) {
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState('pdf')
  const [exportError, setExportError] = useState('')
  const selectedFormat = EXPORT_FORMATS.find(format => format.id === exportFormat) || EXPORT_FORMATS[0]
  const pageText = `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`

  const exportAsPDF = async () => {
    setExporting(true)
    setExportError('')
    try {
      const doc = new jsPDF('p', 'mm', 'a4')
      
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) doc.addPage()
        
        const img = await loadImage(pages[i].image)
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        const ratio = Math.min(210 / img.width, 297 / img.height)
        const width = img.width * ratio
        const height = img.height * ratio
        const x = (210 - width) / 2
        const y = (297 - height) / 2
        
        doc.addImage(imgData, 'JPEG', x, y, width, height)
      }
      
      doc.save(`document_${Date.now()}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
      setExportError('We could not create the PDF. Try again, or export the pages as images.')
    } finally {
      setExporting(false)
    }
  }

  const exportAsImage = async (format) => {
    setExporting(true)
    setExportError('')
    try {
      for (let i = 0; i < pages.length; i++) {
        const img = await loadImage(pages[i].image)
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
        const ext = format === 'png' ? 'png' : 'jpg'

        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((nextBlob) => {
            if (nextBlob) {
              resolve(nextBlob)
            } else {
              reject(new Error('Image export failed'))
            }
          }, mimeType, 0.95)
        })

        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `page_${i + 1}.${ext}`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      }
    } catch (err) {
      console.error('Image export failed:', err)
      setExportError('We could not export the image files. Try another format or remove the problem page.')
    } finally {
      setExporting(false)
    }
  }

  const loadImage = (blob) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(img.src)
        resolve(img)
      }
      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        reject(new Error('Unable to load page for export'))
      }
      img.src = URL.createObjectURL(blob)
    })
  }

  return (
    <div className="export-panel">
      <div className="export-header">
        <div>
          <span className="section-eyebrow">Download</span>
          <h3>Export document</h3>
        </div>
        <strong>{pageText}</strong>
      </div>
      <div className="export-options" role="radiogroup" aria-label="Export format">
        {EXPORT_FORMATS.map(format => (
          <button
            key={format.id}
            className={`export-btn ${exportFormat === format.id ? 'active' : ''}`}
            type="button"
            role="radio"
            aria-checked={exportFormat === format.id}
            disabled={exporting}
            onClick={() => setExportFormat(format.id)}
          >
            <span className="format-mark">{format.label}</span>
            <span className="format-copy">
              <strong>{format.title}</strong>
              <span>{format.detail}</span>
            </span>
            <span className="format-check" aria-hidden="true"></span>
          </button>
        ))}
      </div>
      {exportError && (
        <div className="export-error" role="alert">
          <strong>Export failed</strong>
          <span>{exportError}</span>
        </div>
      )}
      <div className="export-download-card">
        <div className="download-summary">
          <span>Selected format</span>
          <strong>{selectedFormat.title}</strong>
          <small>{selectedFormat.output}</small>
        </div>
        <button
          className="export-download-btn"
          type="button"
          onClick={() => exportFormat === 'pdf' ? exportAsPDF() : exportAsImage(exportFormat)}
          disabled={exporting}
        >
          <span className="download-icon" aria-hidden="true"></span>
          <span>
            <strong>{exporting ? 'Preparing download' : `Download ${selectedFormat.label}`}</strong>
            <small>{exporting ? 'Please wait' : pageText}</small>
          </span>
        </button>
      </div>
    </div>
  )
}

export default ExportPanel
