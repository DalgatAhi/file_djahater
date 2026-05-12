const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const upload = require('../middleware/upload');
const { deleteFile, sweepDirectory } = require('../utils/cleanup');

const compressedDir = path.join(__dirname, '../../compressed');

// Quality presets mapped to sharp options
const QUALITY_PRESETS = {
  max: { quality: 50, effort: 6 },
  balanced: { quality: 75, effort: 4 },
  high: { quality: 90, effort: 2 },
};

router.post('/compress', upload.single('file'), async (req, res) => {
  const inputPath = req.file?.path;

  try {
    // Sweep old temp files on each request
    sweepDirectory(path.join(__dirname, '../../uploads'));
    sweepDirectory(compressedDir);

    if (!req.file) {
      return res.status(400).json({ error: 'NO_FILE', message: 'Файл не получен' });
    }

    const { mode = 'balanced', format = 'webp' } = req.body;
    const preset = QUALITY_PRESETS[mode] || QUALITY_PRESETS.balanced;
    const outputFormat = ['webp', 'jpeg', 'png'].includes(format) ? format : 'webp';

    const outputFileName = `${uuidv4()}.${outputFormat === 'jpeg' ? 'jpg' : outputFormat}`;
    const outputPath = path.join(compressedDir, outputFileName);

    // Build sharp pipeline based on target format
    let pipeline = sharp(inputPath);

    if (outputFormat === 'webp') {
      pipeline = pipeline.webp({ quality: preset.quality, effort: preset.effort });
    } else if (outputFormat === 'jpeg') {
      pipeline = pipeline.jpeg({ quality: preset.quality, mozjpeg: true });
    } else if (outputFormat === 'png') {
      // PNG quality maps to compressionLevel (0-9); invert the quality scale
      const compressionLevel = Math.round((100 - preset.quality) / 11);
      pipeline = pipeline.png({ compressionLevel, effort: preset.effort });
    }

    await pipeline.toFile(outputPath);

    const originalSize = req.file.size;
    const compressedSize = fs.statSync(outputPath).size;
    const savings = Math.round(((originalSize - compressedSize) / originalSize) * 100);

    // Remove the uploaded source immediately after processing
    deleteFile(inputPath);

    res.json({
      success: true,
      originalName: req.file.originalname,
      originalSize,
      compressedSize,
      savings,
      format: outputFormat,
      downloadUrl: `/download/${outputFileName}`,
      fileName: outputFileName,
    });
  } catch (err) {
    deleteFile(inputPath);

    if (err.message === 'UNSUPPORTED_FORMAT') {
      return res.status(415).json({ error: 'UNSUPPORTED_FORMAT', message: 'Неподдерживаемый формат файла' });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'FILE_TOO_LARGE', message: 'Файл превышает 25 МБ' });
    }

    console.error('Compression error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Ошибка обработки файла' });
  }
});

// Delete compressed file after download
router.delete('/file/:filename', (req, res) => {
  const filePath = path.join(compressedDir, path.basename(req.params.filename));
  deleteFile(filePath);
  res.json({ success: true });
});

module.exports = router;
