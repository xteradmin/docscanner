const ImageFilters = {
  async applyEnhance(imageBlob) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        this.autoContrast(imageData)
        this.sharpen(imageData, canvas.width, canvas.height)
        ctx.putImageData(imageData, 0, 0)

        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
      }
      img.src = URL.createObjectURL(imageBlob)
    })
  },

  autoContrast(imageData) {
    const { data } = imageData
    let min = 255, max = 0
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      if (gray < min) min = gray
      if (gray > max) max = gray
    }

    const range = max - min || 1
    for (let i = 0; i < data.length; i += 4) {
      data[i] = ((data[i] - min) / range) * 255
      data[i + 1] = ((data[i + 1] - min) / range) * 255
      data[i + 2] = ((data[i + 2] - min) / range) * 255
    }
  },

  sharpen(imageData, width, height) {
    const { data } = imageData
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ]

    const output = new Uint8ClampedArray(data.length)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c
              sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)]
            }
          }
          output[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum))
        }
        output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3]
      }
    }
    
    for (let i = 0; i < data.length; i++) {
      data[i] = output[i]
    }
  }
}

export default ImageFilters
