const PerspectiveTransform = {
  async warpPerspective(imageBlob, corners, outputWidth = 2480, outputHeight = 3508) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = outputWidth
        canvas.height = outputHeight
        const ctx = canvas.getContext('2d')

        const srcPoints = corners.map(c => ({
          x: c.x * img.width,
          y: c.y * img.height
        }))

        const dstPoints = [
          { x: 0, y: 0 },
          { x: outputWidth, y: 0 },
          { x: outputWidth, y: outputHeight },
          { x: 0, y: outputHeight }
        ]

        ctx.drawImage(img, 0, 0, outputWidth, outputHeight)
        
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
      }
      img.src = URL.createObjectURL(imageBlob)
    })
  }
}

export default PerspectiveTransform
