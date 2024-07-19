const express = require('express')
const multer = require('multer')
const fetch = require('node-fetch')
const path = require('path')
const fs = require('fs')

const app = express()
const port = 3000

const upload = multer({ dest: 'uploads/' })

app.use(express.json())
app.use(express.static('public'))

app.post('/upload', upload.single('psdFile'), async (req, res) => {
  const { layerName, newText } = req.body
  const psdFilePath = path.join(__dirname, req.file.path)

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
    const response = await fetch('https://www.photopea.com/api/', {
      method: 'POST',
      body: JSON.stringify({ script }),
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error('Failed to excute script')
    }

    const result = await response.json()
    res.json({
      success: true,
      result,
      filePath: `/uploads/${req.file.filename}`,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'Error executing script' })
  }
})

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
