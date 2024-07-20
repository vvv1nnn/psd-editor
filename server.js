const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const app = express()
const port = 3000

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  },
})
const upload = multer({ storage: storage })

app.use(express.json())
app.use(express.static('public'))

app.post('/upload', upload.single('psdFile'), async (req, res) => {
  const { layerName, newText } = req.body
  const psdFilePath = path.join(__dirname, 'uploads', req.file.filename)

  const script = `
    var openFile = new File("${psdFilePath}");
    app.open(openFile);

    var textLayer = app.activeDocument.artLayers.getByName("${layerName}");
    textLayer.textItem.contents = "${newText}";

    var saveOptions = new PhotoshopSaveOptions();
    saveOptions.alphaChannels = true;
    app.activeDocument.saveAs(openFile, saveOptions, true, Extension.LOWERCASE);
    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
  `

  try {
    const fetch = (await import('node-fetch')).default

    const response = await fetch('https://www.photopea.com/api/', {
      method: 'POST',
      body: JSON.stringify({ script }),
      headers: { 'Content-Type': 'application/json' },
    })

    const responseText = await response.text() // Get the response text

    // Check if the response is JSON or HTML (error page)
    try {
      const result = JSON.parse(responseText)

      if (!response.ok) {
        throw new Error('Failed to execute script')
      }

      res.json({
        success: true,
        result,
        filePath: `/uploads/${req.file.filename}`,
      })
    } catch (jsonError) {
      // Log the HTML response for debugging
      console.error('HTML response:', responseText)
      throw new Error('Received an HTML response instead of JSON')
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'Error executing script' })
  }
})

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
