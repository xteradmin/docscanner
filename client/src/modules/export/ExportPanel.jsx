import { useState } from 'react'
import jsPDF from 'jspdf'

function ExportPanel({ pages }) {
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState('pdf')

  const exportAsPDF = async () => {
    setExporting(true)
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
    }
    setExporting(false)
  }

  const exportAsImage = async (format) => {
    setExporting(true)
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
        
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `page_${i + 1}.${ext}`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, mimeType, 0.95)
      }
    } catch (err) {
      console.error('Image export failed:', err)
    }
    setExporting(false)
  }

  const loadImage = (blob) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(img.src)
        resolve(img)
      }
      img.onerror = reject
      img.src = URL.createObjectURL(blob)
    })
  }

  return (
    <div className="export-panel">
      <h3>Export Document</h3>
      <div className="export-options">
        <button
          className={`export-btn ${exportFormat === 'pdf' ? 'active' : ''}`}
          onClick={() => setExportFormat('pdf')}
        >
          PDF
        </button>
        <button
          className={`export-btn ${exportFormat === 'jpg' ? 'active' : ''}`}
          onClick={() => setExportFormat('jpg')}
        >
          JPG
        </button>
        <button
          className={`export-btn ${exportFormat === 'png' ? 'active' : ''}`}
          onClick={() => setExportFormat('png')}
        >
          PNG
        </button>
      </div>
      <button
        className="export-download-btn"
        onClick={() => exportFormat === 'pdf' ? exportAsPDF() : exportAsImage(exportFormat)}
        disabled={exporting}
      >
        {exporting ? 'Exporting...' : `Download as ${exportFormat.toUpperCase()}`}
      </button>
    </div>
  )
}

export default ExportPanel
