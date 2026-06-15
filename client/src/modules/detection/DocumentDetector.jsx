const DocumentDetector = {
  async detectDocument(imageBlob) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const corners = this.findDocumentCorners(imageData, img.width, img.height)
        
        URL.revokeObjectURL(img.src)
        resolve(corners)
      }
      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        reject(new Error('Unable to load image for detection'))
      }
      img.src = URL.createObjectURL(imageBlob)
    })
  },

  findDocumentCorners(imageData, width, height) {
    const { data } = imageData
    const gray = new Float32Array(width * height)
    
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    }

    const edges = this.cannyEdgeDetection(gray, width, height)
    const contours = this.findContours(edges, width, height)
    const largestRect = this.findLargestRectangle(contours, width, height)
    
    if (largestRect) {
      return this.orderCorners(largestRect).map(p => ({
        x: p.x / width,
        y: p.y / height
      }))
    }

    const margin = 0.05
    return [
      { x: margin, y: margin },
      { x: 1 - margin, y: margin },
      { x: 1 - margin, y: 1 - margin },
      { x: margin, y: 1 - margin }
    ]
  },

  cannyEdgeDetection(gray, width, height) {
    const edges = new Uint8Array(width * height)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const gx = -gray[(y-1)*width + (x-1)] + gray[(y-1)*width + (x+1)]
                  -2*gray[y*width + (x-1)] + 2*gray[y*width + (x+1)]
                  -gray[(y+1)*width + (x-1)] + gray[(y+1)*width + (x+1)]
        const gy = -gray[(y-1)*width + (x-1)] - 2*gray[(y-1)*width + x] - gray[(y-1)*width + (x+1)]
                  +gray[(y+1)*width + (x-1)] + 2*gray[(y+1)*width + x] + gray[(y+1)*width + (x+1)]
        const magnitude = Math.sqrt(gx * gx + gy * gy)
        edges[idx] = magnitude > 50 ? 255 : 0
      }
    }
    return edges
  },

  findContours(edges, width, height) {
    const visited = new Uint8Array(width * height)
    const contours = []

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        if (edges[idx] === 255 && !visited[idx]) {
          const contour = []
          this.traceContour(edges, visited, x, y, width, height, contour)
          if (contour.length > 50) {
            contours.push(contour)
          }
        }
      }
    }
    return contours
  },

  traceContour(edges, visited, startX, startY, width, height, contour) {
    const stack = [[startX, startY]]
    const directions = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]

    while (stack.length > 0 && contour.length < 10000) {
      const [x, y] = stack.pop()
      const idx = y * width + x

      if (x < 0 || x >= width || y < 0 || y >= height || visited[idx] || edges[idx] !== 255) {
        continue
      }

      visited[idx] = 1
      contour.push({ x, y })

      for (const [dx, dy] of directions) {
        stack.push([x + dx, y + dy])
      }
    }
  },

  findLargestRectangle(contours, width, height) {
    let largestArea = 0
    let bestRect = null

    for (const contour of contours) {
      const hull = this.convexHull(contour)
      if (hull.length >= 4) {
        const rect = this.approximateRectangle(hull)
        if (rect) {
          const area = this.polygonArea(rect)
          if (area > largestArea && area > (width * height * 0.1)) {
            largestArea = area
            bestRect = rect
          }
        }
      }
    }
    return bestRect
  },

  orderCorners(points) {
    const bySum = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y))
    const byDiff = [...points].sort((a, b) => (a.x - a.y) - (b.x - b.y))

    return [
      bySum[0],
      byDiff[byDiff.length - 1],
      bySum[bySum.length - 1],
      byDiff[0]
    ]
  },

  convexHull(points) {
    if (points.length < 3) return points
    
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
    const hull = []

    for (const point of sorted) {
      while (hull.length >= 2 && this.cross(hull[hull.length-2], hull[hull.length-1], point) <= 0) {
        hull.pop()
      }
      hull.push(point)
    }

    const lowerLength = hull.length
    for (let i = sorted.length - 2; i >= 0; i--) {
      while (hull.length > lowerLength && this.cross(hull[hull.length-2], hull[hull.length-1], sorted[i]) <= 0) {
        hull.pop()
      }
      hull.push(sorted[i])
    }

    hull.pop()
    return hull
  },

  cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  },

  approximateRectangle(hull) {
    if (hull.length === 4) return hull
    
    const approx = []
    const eps = hull.length * 0.02
    
    for (let i = 0; i < hull.length; i++) {
      const prev = hull[(i - 1 + hull.length) % hull.length]
      const curr = hull[i]
      const next = hull[(i + 1) % hull.length]
      
      if (this.pointToLineDistance(prev, curr, next) > eps) {
        approx.push(curr)
      }
    }

    return approx.length === 4 ? approx : null
  },

  pointToLineDistance(p, a, b) {
    const A = p.x - a.x
    const A2 = p.y - a.y
    const B = b.x - a.x
    const B2 = b.y - a.y
    const dot = A * B + A2 * B2
    const lenSq = B * B + B2 * B2
    let param = lenSq !== 0 ? dot / lenSq : -1

    param = Math.max(0, Math.min(1, param))
    const xx = a.x + param * B
    const yy = a.y + param * B2

    return Math.sqrt((p.x - xx) * (p.x - xx) + (p.y - yy) * (p.y - yy))
  },

  polygonArea(points) {
    let area = 0
    const n = points.length
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      area += points[i].x * points[j].y
      area -= points[j].x * points[i].y
    }
    return Math.abs(area) / 2
  }
}

export default DocumentDetector
