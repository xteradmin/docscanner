import React, { useState, useEffect } from 'react'

function VideoDownloadTool() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Initializing download...')

  useEffect(() => {
    if (!loading) {
      setProgress(0)
      return
    }
    
    let current = 0
    const interval = setInterval(() => {
      current += Math.random() * 3
      if (current > 95) current = 95
      
      setProgress(Math.floor(current))
      
      if (current < 20) setStatus('Fetching media info...')
      else if (current < 50) setStatus('Downloading video streams...')
      else if (current < 80) setStatus('Downloading audio streams...')
      else setStatus('Merging media formats...')
      
    }, 600)

    return () => clearInterval(interval)
  }, [loading])

  const handleDownload = async (e) => {
    e.preventDefault()
    if (!url) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/video/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to download video')
      }

      // Handle file download
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = downloadUrl
      
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'downloaded_video.mp4'
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) {
          filename = match[1]
        }
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      a.remove()
      
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tool-container" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginBottom: '1rem', color: '#333' }}>Download Video</h2>
      <p style={{ marginBottom: '1.5rem', color: '#666' }}>Enter a URL from a supported video platform (e.g., YouTube) to download the video directly to your device.</p>
      
      <form onSubmit={handleDownload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="url" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Video URL</label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }}
          />
        </div>
        
        {error && <div style={{ color: '#d32f2f', padding: '0.75rem', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</div>}
        
        {loading && (
          <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <strong>{status}</strong>
              <span>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#1976d2', transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !url}
          style={{
            padding: '0.75rem',
            backgroundColor: loading ? '#9e9e9e' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Processing...' : 'Download Video'}
        </button>
      </form>
    </div>
  )
}

export default VideoDownloadTool
