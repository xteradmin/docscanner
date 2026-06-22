import { Router } from 'express'
import multer from 'multer'
import { PDFDocument } from 'pdf-lib'
import { v4 as uuidv4 } from 'uuid'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const archiver = require('archiver')

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

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

    const archive = archiver('zip', { zlib: { level: 6 } })
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

export default router
