import jsPDF from 'jspdf'

function ExportPanel({ pages }) {
  const exportAsPDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4')
    
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) doc.addPage()
      const imgData = URL.createObjectURL(pages[i].image)
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297)
    }
    
    doc.save('document.pdf')
  }

  const exportAsImage = (format = 'jpeg') => {
    pages.forEach((page, index) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(page.image)
      a.download = `page_${index + 1}.${format}`
      a.click()
    })
  }

  return (
    <div className="export-panel card">
      <h3>Export Document</h3>
      <button onClick={exportAsPDF}>Export as PDF</button>
      <button onClick={() => exportAsImage('jpeg')}>Export as JPEG</button>
      <button onClick={() => exportAsImage('png')}>Export as PNG</button>
    </div>
  )
}

export default ExportPanel
