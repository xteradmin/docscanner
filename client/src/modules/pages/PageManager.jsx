import { useState, useEffect } from 'react'

function PageManager({ pages, setPages }) {
  const [activePage, setActivePage] = useState(0)

  const removePage = (id) => {
    setPages(pages.filter(p => p.id !== id))
  }

  const reorderPages = (fromIndex, toIndex) => {
    const newPages = [...pages]
    const [removed] = newPages.splice(fromIndex, 1)
    newPages.splice(toIndex, 0, removed)
    setPages(newPages)
  }

  return (
    <div className="page-manager card">
      <h3>Document Pages ({pages.length})</h3>
      <div className="page-list">
        {pages.map((page, index) => (
          <div key={page.id} className="page-item">
            <img 
              src={URL.createObjectURL(page.image)} 
              alt={`Page ${index + 1}`}
              style={{ width: '100px', height: '140px', objectFit: 'cover' }}
            />
            <span>Page {index + 1}</span>
            <button onClick={() => removePage(page.id)}>Remove</button>
            {index > 0 && (
              <button onClick={() => reorderPages(index, index - 1)}>↑</button>
            )}
            {index < pages.length - 1 && (
              <button onClick={() => reorderPages(index, index + 1)}>↓</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default PageManager
