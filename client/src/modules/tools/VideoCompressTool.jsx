import React, { useState, useEffect } from 'react'

function VideoCompressTool() {
  const [file, setFile] = useState(null)
  const [quality, setQuality] = useState('480p')
  const [error, setError] = useState(null)
  
  const [processing, setProcessing] = useState(false)
  const [phase, setPhase] = useState('') // '', 'uploading', 'processing'
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingTimemark, setProcessingTimemark] = useState(null)
  const [processingStatus, setProcessingStatus] = useState('Initializing...')
  const [jobId, setJobId] = useState(null)
  const [videoDuration, setVideoDuration] = useState(0)

  const qualities = ['240p', '360p', '480p', '720p', '1080p']

  useEffect(() => {
    if (phase !== 'processing' || !jobId) {
      return
    }
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/video/progress/${jobId}`)
        if (res.ok) {
          const data = await res.json()
          
          let currentP = 0
          if (data.progress === -1) {
            setProcessingTimemark(data.timemark || '00:00:00')
            setProcessingStatus(`Encoding video...`)
            setProcessingProgress(prev => {
              let next = prev + (Math.random() * 2.5)
              currentP = next > 95 ? 95 : Math.floor(next)
              return currentP
            })
          } else {
            setProcessingTimemark(null)
            currentP = data.progress || 0
            setProcessingProgress(currentP)
            if (currentP < 20) setProcessingStatus('Analyzing video streams...')
            else if (currentP < 95) setProcessingStatus('Applying FFmpeg compression filters...')
            else setProcessingStatus('Finalizing MP4 container...')
          }
        }
      } catch (e) {
        // silently fail on poll error
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, jobId])

  const handleCompress = (e) => {
    e.preventDefault()
    if (!file) return

    const newJobId = Date.now().toString()
    setJobId(newJobId)
    setProcessing(true)
    setPhase('uploading')
    setUploadProgress(0)
    setProcessingProgress(0)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('quality', quality)
    formData.append('jobId', newJobId)
    if (videoDuration) formData.append('duration', videoDuration)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/video/compress')
    xhr.responseType = 'blob'

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        setUploadProgress(percent)
        if (percent >= 100 && phase !== 'downloading') {
          setPhase('processing')
        }
      }
    }

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        setPhase('downloading')
        const percent = Math.round((event.loaded / event.total) * 100)
        setProcessingProgress(percent)
        setProcessingStatus('Downloading compressed video...')
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = xhr.response
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = downloadUrl
        
        const contentDisposition = xhr.getResponseHeader('content-disposition')
        let filename = `compressed_${file.name}`
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
        
        setProcessing(false)
        setPhase('')
      } else {
        const reader = new FileReader()
        reader.onload = () => {
          let msg = 'Failed to compress video'
          try {
            msg = JSON.parse(reader.result).error || msg
          } catch (err) {}
          setError(msg)
          setProcessing(false)
          setPhase('')
        }
        reader.readAsText(xhr.response)
      }
    }

    xhr.onerror = () => {
      setError('A network error occurred during upload.')
      setProcessing(false)
      setPhase('')
    }

    xhr.send(formData)
  }

  return (
    <div className="tool-container" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginBottom: '1rem', color: '#333' }}>Compress Video</h2>
      <p style={{ marginBottom: '1.5rem', color: '#666' }}>Upload a video file to compress and reduce its file size.</p>
      
      <form onSubmit={handleCompress} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="videoFile" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Select Video</label>
          <input
            id="videoFile"
            type="file"
            accept="video/*"
            onChange={(e) => {
              const selected = e.target.files[0]
              setFile(selected)
              if (selected) {
                const video = document.createElement('video')
                video.preload = 'metadata'
                video.onloadedmetadata = () => {
                  window.URL.revokeObjectURL(video.src)
                  setVideoDuration(video.duration)
                }
                video.src = window.URL.createObjectURL(selected)
              }
            }}
            required
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        
        <div>
          <label htmlFor="quality" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Target Quality</label>
          <select
            id="quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem', backgroundColor: '#fff' }}
          >
            {qualities.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
        
        {error && <div style={{ color: '#d32f2f', padding: '0.75rem', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</div>}
        
        {processing && phase === 'uploading' && (
          <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <strong>Uploading video...</strong>
              <span>{uploadProgress}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#1976d2', transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        {processing && (phase === 'processing' || phase === 'downloading') && (
          <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <strong>{processingStatus}</strong>
              {processingTimemark && phase === 'processing' ? (
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{processingTimemark}</span>
              ) : (
                <span>{phase === 'downloading' ? processingProgress : Math.min(processingProgress, 95)}%</span>
              )}
            </div>
            <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${phase === 'downloading' ? processingProgress : Math.min(processingProgress, 95)}%`, height: '100%', background: '#1976d2', transition: 'width 0.5s ease' }} />
            </div>
            {phase === 'processing' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                Note: Video compression is CPU-intensive and may take several minutes for large files.
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={processing || !file}
          style={{
            padding: '0.75rem',
            backgroundColor: processing ? '#9e9e9e' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: processing ? 'not-allowed' : 'pointer'
          }}
        >
          {processing ? 'Processing...' : 'Compress Video'}
        </button>
      </form>
    </div>
  )
}

export default VideoCompressTool
