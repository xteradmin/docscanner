import { Router } from 'express'
import multer from 'multer'
import { PDFDocument } from 'pdf-lib'
import { v4 as uuidv4 } from 'uuid'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { ZipArchive } from 'archiver'
import youtubedl from 'youtube-dl-exec'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'

// Tell fluent-ffmpeg to use the static binary we just installed
ffmpeg.setFfmpegPath(ffmpegStatic)

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } })

// In-memory store for real-time video processing progress
const jobProgress = new Map()

router.get('/video/progress/:jobId', (req, res) => {
  const p = jobProgress.get(req.params.jobId)
  if (p === undefined) return res.json({ progress: 0, timemark: '00:00:00' })
  res.json({ 
    progress: p.percent !== undefined ? p.percent : -1,
    timemark: p.timemark || '00:00:00'
  })
})

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.post('/pdf/generate', upload.array('images', 20), async (req, res) => {
  try {
    const pdfDoc = await PDFDocument.create()
    
    for (const file of req.files) {
      const image = file.mimetype === 'image/png'
        ? await pdfDoc.embedPng(file.buffer)
        : await pdfDoc.embedJpg(file.buffer)
      const page = pdfDoc.addPage([image.width, image.height])
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
    }
    
    const pdfBytes = await pdfDoc.save()
    const filename = req.body.filename || `document_${Date.now()}`
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
    res.send(Buffer.from(pdfBytes))
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate PDF' })
  }
})

router.post('/documents', async (req, res) => {
  const { title, pages } = req.body
  const docId = uuidv4()
  const uploadDir = process.env.UPLOAD_DIR || '/data/docscanner/uploads'
  const docDir = path.join(uploadDir, docId)
  
  if (!existsSync(docDir)) {
    await mkdir(docDir, { recursive: true })
  }
  
  res.json({ id: docId, title, pageCount: pages?.length || 0, createdAt: new Date().toISOString() })
})

router.get('/documents', (req, res) => {
  res.json({ documents: [] })
})

// ─── PDF Merge (Combine) ───────────────────────────────────────────────────────
router.post('/pdf/merge', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Please upload at least 1 PDF file to merge.' })
    }

    const mergedPdf = await PDFDocument.create()
    const loadedDocs = []
    
    for (const file of req.files) {
      loadedDocs.push(await PDFDocument.load(file.buffer, { ignoreEncryption: true }))
    }

    if (req.body.pageOrder) {
      const pageOrder = JSON.parse(req.body.pageOrder)
      
      const copiedPagesMap = new Map()
      for (let i = 0; i < loadedDocs.length; i++) {
        const indices = new Set()
        pageOrder.forEach(p => { if (p.fileIndex === i) indices.add(p.pageIndex) })
        if (indices.size > 0) {
          const uniqueIndices = Array.from(indices).sort((a, b) => a - b)
          const copied = await mergedPdf.copyPages(loadedDocs[i], uniqueIndices)
          const pageMap = new Map()
          uniqueIndices.forEach((idx, copyIdx) => pageMap.set(idx, copied[copyIdx]))
          copiedPagesMap.set(i, pageMap)
        }
      }

      for (const p of pageOrder) {
        if (copiedPagesMap.has(p.fileIndex) && copiedPagesMap.get(p.fileIndex).has(p.pageIndex)) {
          const page = copiedPagesMap.get(p.fileIndex).get(p.pageIndex)
          mergedPdf.addPage(page)
        }
      }
    } else {
      // Legacy support
      for (const srcDoc of loadedDocs) {
        const pageIndices = srcDoc.getPageIndices()
        const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices)
        copiedPages.forEach(page => mergedPdf.addPage(page))
      }
    }

    const pdfBytes = await mergedPdf.save()
    const filename = req.body.filename || `merged_${Date.now()}`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
    res.send(Buffer.from(pdfBytes))
  } catch (error) {
    console.error('PDF merge error:', error)
    res.status(500).json({ error: 'Failed to merge PDF files.' })
  }
})

// ─── PDF Split ──────────────────────────────────────────────────────────────────
router.post('/pdf/split', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file to split.' })
    }

    const srcDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true })
    const totalPages = srcDoc.getPageCount()

    // Parse ranges from body, e.g. "1-3,5,7-9" or "all"
    const rangesRaw = req.body.ranges || 'all'
    const pageGroups = parsePageRanges(rangesRaw, totalPages)

    if (pageGroups.length === 0) {
      return res.status(400).json({ error: 'No valid page ranges provided.' })
    }

    // If only one group, return a single PDF directly
    if (pageGroups.length === 1) {
      const newDoc = await PDFDocument.create()
      const copied = await newDoc.copyPages(srcDoc, pageGroups[0])
      copied.forEach(page => newDoc.addPage(page))
      const pdfBytes = await newDoc.save()
      const filename = req.body.filename || `split_${Date.now()}`

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
      return res.send(Buffer.from(pdfBytes))
    }

    // Multiple groups → ZIP
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="split_pages_${Date.now()}.zip"`)

    const archive = new ZipArchive({ zlib: { level: 6 } })
    archive.pipe(res)

    for (let i = 0; i < pageGroups.length; i++) {
      const newDoc = await PDFDocument.create()
      const copied = await newDoc.copyPages(srcDoc, pageGroups[i])
      copied.forEach(page => newDoc.addPage(page))
      const pdfBytes = await newDoc.save()
      const label = formatRangeLabel(pageGroups[i])
      archive.append(Buffer.from(pdfBytes), { name: `part_${i + 1}_pages_${label}.pdf` })
    }

    await archive.finalize()
  } catch (error) {
    console.error('PDF split error:', error)
    res.status(500).json({ error: 'Failed to split PDF.' })
  }
})

// ─── PDF Compress ───────────────────────────────────────────────────────────────
router.post('/pdf/compress', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file to compress.' })
    }

    const srcDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true })
    const originalSize = req.file.buffer.length

    // Structural compression: repack with object streams to eliminate redundancy
    const cleanPdfBytes = await srcDoc.save({ useObjectStreams: true, addDefaultPage: false })

    // Second pass: further deduplication with batched object writing
    const reloadedDoc = await PDFDocument.load(cleanPdfBytes, { ignoreEncryption: true })
    const finalBytes = await reloadedDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 100
    })

    const compressedSize = finalBytes.length
    const reduction = Math.max(0, Math.round((1 - compressedSize / originalSize) * 100))

    const filename = req.body.filename || `compressed_${Date.now()}`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
    res.setHeader('X-Original-Size', originalSize)
    res.setHeader('X-Compressed-Size', compressedSize)
    res.setHeader('X-Reduction-Percent', reduction)
    res.send(Buffer.from(finalBytes))
  } catch (error) {
    console.error('PDF compress error:', error)
    res.status(500).json({ error: 'Failed to compress PDF.' })
  }
})

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Parse range string like "1-3,5,7-9" into array of index arrays.
 * Each group is an array of 0-based page indices.
 */
function parsePageRanges(raw, totalPages) {
  const trimmed = raw.trim().toLowerCase()

  if (trimmed === 'all') {
    return [Array.from({ length: totalPages }, (_, i) => i)]
  }

  // "each" or "every" → one group per page
  if (trimmed === 'each' || trimmed === 'every') {
    return Array.from({ length: totalPages }, (_, i) => [i])
  }

  const groups = raw.split(',').map(s => s.trim()).filter(Boolean)
  const result = []

  for (const group of groups) {
    const match = group.match(/^(\d+)\s*-\s*(\d+)$/)
    if (match) {
      const start = Math.max(1, parseInt(match[1], 10))
      const end = Math.min(totalPages, parseInt(match[2], 10))
      if (start <= end) {
        result.push(Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i))
      }
    } else {
      const pageNum = parseInt(group, 10)
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        result.push([pageNum - 1])
      }
    }
  }

  return result
}

function formatRangeLabel(indices) {
  if (indices.length === 1) return String(indices[0] + 1)
  const first = indices[0] + 1
  const last = indices[indices.length - 1] + 1
  return `${first}-${last}`
}

// ─── Video Tools ────────────────────────────────────────────────────────────────

router.post('/video/download', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'URL is required' })

    const filename = `video_${Date.now()}.mp4`
    const filepath = path.join(tmpdir(), filename)

    await youtubedl(url, {
      output: filepath,
      format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
      mergeOutputFormat: 'mp4',
      ffmpegLocation: ffmpegStatic
    })

    if (!existsSync(filepath)) {
      return res.status(500).json({ error: 'Video downloaded but failed to merge. Please ensure FFmpeg is in your system PATH and restart the server.' })
    }

    res.download(filepath, filename, async (err) => {
      if (err) {
        console.error('File send error:', err)
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to send downloaded video' })
        }
      }
      await unlink(filepath).catch(() => {})
    })
  } catch (error) {
    console.error('Video download error:', error)
    res.status(500).json({ error: 'Failed to download video' })
  }
})

router.post('/video/compress', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Please upload a video file to compress.' })
    const { quality = '480p', jobId, duration } = req.body

    const inputPath = path.join(tmpdir(), `input_${Date.now()}.mp4`)
    const outputPath = path.join(tmpdir(), `compressed_${Date.now()}.mp4`)
    await writeFile(inputPath, req.file.buffer)

    if (jobId) jobProgress.set(jobId, { percent: -1, timemark: '00:00:00' })

    const totalSeconds = duration ? parseFloat(duration) : null

    const qualitySettings = {
      '240p': { res: '426x240', vb: '500k' },
      '360p': { res: '640x360', vb: '800k' },
      '480p': { res: '854x480', vb: '1000k' },
      '720p': { res: '1280x720', vb: '2000k' },
      '1080p': { res: '1920x1080', vb: '4000k' },
    }

    const qs = qualitySettings[quality] || qualitySettings['480p']

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-y',
          '-c:v libx264',
          '-preset ultrafast',
          '-crf 23',
          `-b:v ${qs.vb}`,
          `-s ${qs.res}`,
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart'
        ])
        .on('progress', (progress) => {
          if (jobId) {
            let p = jobProgress.get(jobId) || { percent: -1, timemark: '00:00:00' }
            
            // Try to calculate percentage manually if duration is provided
            if (progress.timemark) {
              p.timemark = progress.timemark
              if (totalSeconds && totalSeconds > 0) {
                const parts = progress.timemark.split(':')
                if (parts.length === 3) {
                  const h = parseFloat(parts[0]) || 0
                  const m = parseFloat(parts[1]) || 0
                  const s = parseFloat(parts[2]) || 0
                  const currentSeconds = (h * 3600) + (m * 60) + s
                  progress.percent = (currentSeconds / totalSeconds) * 100
                }
              }
            }

            if (progress.percent !== undefined && !isNaN(progress.percent)) {
              let pct = Math.floor(progress.percent)
              if (pct < 0) pct = 0
              if (pct > 99) pct = 99
              p.percent = pct
            }
            
            jobProgress.set(jobId, p)
          }
        })
        .on('end', () => {
          if (jobId) jobProgress.set(jobId, { percent: 100, timemark: 'Done' })
          resolve()
        })
        .on('error', (err) => {
          if (jobId) jobProgress.delete(jobId)
          reject(err)
        })
        .save(outputPath)
    })

    const originalname = req.file.originalname || 'video.mp4'
    const compressedFilename = `compressed_${originalname}`

    res.download(outputPath, compressedFilename, async (err) => {
      if (jobId) jobProgress.delete(jobId)
      await unlink(inputPath).catch(console.error)
      if (!err) {
        await unlink(outputPath).catch(console.error)
      }
    })
  } catch (error) {
    console.error('Video compress error:', error)
    res.status(500).json({ error: 'Failed to compress video' })
  }
})

export default router
