const DocumentDetector = {
  async detectDocument(imageBlob) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const corners = this.findDocumentCorners(imageData)
        resolve(corners)
      }
      img.src = URL.createObjectURL(imageBlob)
    })
  },

  findDocumentCorners(imageData) {
    const { width, height, data } = imageData
    const gray = new Uint8ClampedArray(width * height)
    
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
    }

    const corners = [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 }
    ]

    return corners
  }
}

export default DocumentDetector
