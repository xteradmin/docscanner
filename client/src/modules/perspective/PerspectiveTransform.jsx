const PerspectiveTransform = {
  async warpPerspective(imageBlob, corners) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const src = document.createElement('canvas')
        src.width = img.width
        src.height = img.height
        const srcCtx = src.getContext('2d')
        srcCtx.drawImage(img, 0, 0)

        const srcPts = corners.map(c => ({
          x: c.x * img.width,
          y: c.y * img.height
        }))

        const wt = Math.hypot(srcPts[1].x - srcPts[0].x, srcPts[1].y - srcPts[0].y)
        const wb = Math.hypot(srcPts[2].x - srcPts[3].x, srcPts[2].y - srcPts[3].y)
        const hl = Math.hypot(srcPts[3].x - srcPts[0].x, srcPts[3].y - srcPts[0].y)
        const hr = Math.hypot(srcPts[2].x - srcPts[1].x, srcPts[2].y - srcPts[1].y)

        const dw = Math.round(Math.max(wt, wb))
        const dh = Math.round(Math.max(hl, hr))

        const dst = document.createElement('canvas')
        dst.width = dw
        dst.height = dh

        const srcData = srcCtx.getImageData(0, 0, img.width, img.height)

        this.warp(
          srcData.data, img.width, img.height,
          dst, dw, dh,
          srcPts
        )

        URL.revokeObjectURL(img.src)
        dst.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
      }
      img.src = URL.createObjectURL(imageBlob)
    })
  },

  warp(srcPixels, sw, sh, dst, dw, dh, srcCorners) {
    const H = this.getPerspectiveTransform(
      [{x:0,y:0}, {x:dw,y:0}, {x:dw,y:dh}, {x:0,y:dh}],
      srcCorners
    )

    const dstData = new Uint8ClampedArray(dw * dh * 4)

    for (let dy = 0; dy < dh; dy++) {
      for (let dx = 0; dx < dw; dx++) {
        const w = H[6] * dx + H[7] * dy + H[8]
        const sx = (H[0] * dx + H[1] * dy + H[2]) / w
        const sy = (H[3] * dx + H[4] * dy + H[5]) / w

        const sx0 = Math.floor(sx)
        const sy0 = Math.floor(sy)
        const sx1 = Math.min(sx0 + 1, sw - 1)
        const sy1 = Math.min(sy0 + 1, sh - 1)

        if (sx0 >= 0 && sy0 >= 0 && sx1 < sw && sy1 < sh) {
          const fx = sx - sx0
          const fy = sy - sy0

          const i00 = (sy0 * sw + sx0) * 4
          const i10 = (sy0 * sw + sx1) * 4
          const i01 = (sy1 * sw + sx0) * 4
          const i11 = (sy1 * sw + sx1) * 4

          const di = (dy * dw + dx) * 4
          for (let c = 0; c < 4; c++) {
            dstData[di + c] = Math.round(
              srcPixels[i00 + c] * (1-fx) * (1-fy) +
              srcPixels[i10 + c] * fx * (1-fy) +
              srcPixels[i01 + c] * (1-fx) * fy +
              srcPixels[i11 + c] * fx * fy
            )
          }
        }
      }
    }

    dst.getContext('2d').putImageData(new ImageData(dstData, dw, dh), 0, 0)
  },

  getPerspectiveTransform(src, dst) {
    const n = 8
    const A = []
    const b = []

    for (let i = 0; i < 4; i++) {
      const sx = src[i].x, sy = src[i].y
      const dx = dst[i].x, dy = dst[i].y
      const row1 = [sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]
      const row2 = [0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]
      A.push(row1)
      A.push(row2)
      b.push(dx, dy)
    }

    const h = this.solveLinear(A, b, n)
    h.push(1)
    return h
  },

  solveLinear(A, b, n) {
    const aug = A.map((row, i) => [...row, b[i]])

    for (let col = 0; col < n; col++) {
      let maxRow = col
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
          maxRow = row
        }
      }
      ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]

      if (Math.abs(aug[col][col]) < 1e-12) continue

      for (let row = col + 1; row < n; row++) {
        const f = aug[row][col] / aug[col][col]
        for (let j = col; j <= n; j++) {
          aug[row][j] -= f * aug[col][j]
        }
      }
    }

    const x = new Array(n)
    for (let i = n - 1; i >= 0; i--) {
      x[i] = aug[i][n]
      for (let j = i + 1; j < n; j++) {
        x[i] -= aug[i][j] * x[j]
      }
      x[i] /= aug[i][i]
    }
    return x
  }
}

export default PerspectiveTransform
