import { useRef, useState } from 'react'

function ImageUpload({ onCapture, disabled }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')

  const handleFile = (file) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.')
      return
    }

    setError('')
    onCapture(file)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  const openPicker = () => {
    if (!disabled) inputRef.current?.click()
  }

  return (
    <div
      className={`upload-panel ${isDragging ? 'dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        className="upload-input"
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(event) => {
          handleFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <div className="upload-icon" aria-hidden="true">
        +
      </div>
      <div className="upload-copy">
        <h3>Upload image</h3>
        <p>Pick or drop a document photo to scan.</p>
      </div>
      <button className="upload-btn" type="button" onClick={openPicker} disabled={disabled}>
        Choose image
      </button>
      {error && <p className="upload-error">{error}</p>}
    </div>
  )
}

export default ImageUpload
