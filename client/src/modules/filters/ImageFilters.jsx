const ImageFilters = {
  async applyFilter(imageBlob, filterName, value = 1) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        switch (filterName) {
          case 'brightness':
            this.brightness(imageData, value)
            break
          case 'contrast':
            this.contrast(imageData, value)
            break
          case 'saturation':
            this.saturation(imageData, value)
            break
          case 'sharpen':
            this.sharpen(imageData, canvas.width, canvas.height, value)
            break
          case 'denoise':
            this.denoise(imageData, canvas.width, canvas.height, value)
            break
          case 'grayscale':
            this.grayscale(imageData)
            break
          case 'enhance':
            this.enhance(imageData, canvas.width, canvas.height)
            break
          default:
            break
        }

        ctx.putImageData(imageData, 0, 0)
        URL.revokeObjectURL(img.src)
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Unable to create filtered image'))
          }
        }, 'image/jpeg', 0.95)
      }
      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        reject(new Error('Unable to load image for filtering'))
      }
      img.src = URL.createObjectURL(imageBlob)
    })
  },

  brightness(imageData, value) {
    const { data } = imageData
    const adjustment = (value - 1) * 255
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] + adjustment))
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment))
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment))
    }
  },

  contrast(imageData, value) {
    const { data } = imageData
    const factor = (259 * (value * 255 + 255)) / (255 * (259 - value * 255))
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128))
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128))
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128))
    }
  },

  saturation(imageData, value) {
    const { data } = imageData
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      data[i] = Math.min(255, Math.max(0, gray + value * (data[i] - gray)))
      data[i + 1] = Math.min(255, Math.max(0, gray + value * (data[i + 1] - gray)))
      data[i + 2] = Math.min(255, Math.max(0, gray + value * (data[i + 2] - gray)))
    }
  },

  sharpen(imageData, width, height, value) {
    const { data } = imageData
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ]
    const strength = value

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
          const original = data[(y * width + x) * 4 + c]
          output[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, original + (sum - original) * strength))
        }
        output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3]
      }
    }
    
    for (let i = 0; i < data.length; i++) {
      data[i] = output[i]
    }
  },

  denoise(imageData, width, height, value) {
    const { data } = imageData
    const output = new Uint8ClampedArray(data.length)
    const size = Math.ceil(value * 2)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0
          let count = 0
          for (let ky = -size; ky <= size; ky++) {
            for (let kx = -size; kx <= size; kx++) {
              const ny = y + ky
              const nx = x + kx
              if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                sum += data[(ny * width + nx) * 4 + c]
                count++
              }
            }
          }
          output[(y * width + x) * 4 + c] = sum / count
        }
        output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3]
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = output[i]
    }
  },

  grayscale(imageData) {
    const { data } = imageData
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
    }
  },

  enhance(imageData, width, height) {
    this.autoContrast(imageData)
    this.sharpen(imageData, width, height, 0.5)
    this.autoWhiteBalance(imageData)
  },

  autoContrast(imageData) {
    const { data } = imageData
    let min = 255, max = 0
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      if (gray < min) min = gray
      if (gray > max) max = gray
    }

    const range = max - min || 1
    const factor = 255 / range
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - min) * factor))
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - min) * factor))
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - min) * factor))
    }
  },

  autoWhiteBalance(imageData) {
    const { data } = imageData
    let rSum = 0, gSum = 0, bSum = 0
    const pixelCount = data.length / 4

    for (let i = 0; i < data.length; i += 4) {
      rSum += data[i]
      gSum += data[i + 1]
      bSum += data[i + 2]
    }

    const rAvg = rSum / pixelCount
    const gAvg = gSum / pixelCount
    const bAvg = bSum / pixelCount
    const avg = (rAvg + gAvg + bAvg) / 3

    const rFactor = avg / (rAvg || 1)
    const gFactor = avg / (gAvg || 1)
    const bFactor = avg / (bAvg || 1)

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * rFactor)
      data[i + 1] = Math.min(255, data[i + 1] * gFactor)
      data[i + 2] = Math.min(255, data[i + 2] * bFactor)
    }
  }
}

export default ImageFilters
