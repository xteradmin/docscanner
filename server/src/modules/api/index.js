import { Router } from 'express'
import multer from 'multer'
import { PDFDocument } from 'pdf-lib'
import { v4 as uuidv4 } from 'uuid'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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

export default router
