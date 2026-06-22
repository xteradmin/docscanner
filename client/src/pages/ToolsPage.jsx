import { useState } from 'react'
import CombineTool from '../modules/tools/CombineTool'
import SplitTool from '../modules/tools/SplitTool'
import CompressTool from '../modules/tools/CompressTool'

const TOOLS = [
  {
    id: 'combine',
    title: 'Combine PDFs',
    description: 'Merge multiple PDF files into a single document. Add files and reorder them before combining.',
    icon: '📎',
    detail: '2+ files → 1 merged PDF'
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Extract specific pages or split a PDF into multiple files by page ranges.',
    icon: '✂️',
    detail: '1 PDF → multiple files'
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce file size by optimizing images and removing unnecessary data from your PDF.',
    icon: '📦',
    detail: 'Smaller file, same quality'
  }
]

const TOOL_COMPONENTS = {
  combine: CombineTool,
  split: SplitTool,
  compress: CompressTool
}

function ToolsPage() {
  const [activeTool, setActiveTool] = useState(null)

  const ActiveComponent = activeTool ? TOOL_COMPONENTS[activeTool] : null

  return (
    <div className="tools-page">
      <header className="tools-header">
        <div>
          <span className="section-eyebrow">Utilities</span>
          <h1 className="tools-title">PDF Tools</h1>
          <p className="tools-subtitle">Quick tools to combine, split, or compress your PDF files — all processing happens on the server.</p>
        </div>
        {activeTool && (
          <button className="btn-secondary compact" type="button" onClick={() => setActiveTool(null)}>
            ← All tools
          </button>
        )}
      </header>

      {!activeTool && (
        <div className="tools-grid">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              className="tool-card"
              type="button"
              onClick={() => setActiveTool(tool.id)}
            >
              <span className="tool-icon" aria-hidden="true">{tool.icon}</span>
              <div className="tool-body">
                <strong>{tool.title}</strong>
                <p>{tool.description}</p>
                <span className="tool-detail">{tool.detail}</span>
              </div>
              <span className="tool-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      )}

      {ActiveComponent && (
        <div className="tool-active-panel">
          <ActiveComponent />
        </div>
      )}
    </div>
  )
}

export default ToolsPage
