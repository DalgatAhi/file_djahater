const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const upload = require('../middleware/upload');
const { deleteFile, sweepDirectory } = require('../utils/cleanup');

const compressedDir = path.join(__dirname, '../../compressed');

// Sharpen params per enhancement mode
const SHARPEN_PRESETS = {
  soft:    { sigma: 0.8, m1: 0.3, m2: 0.2 },
  balance: { sigma: 1.5, m1: 1.5, m2: 0.7 },
  sharp:   { sigma: 2.5, m1: 3.0, m2: 1.5 },
};

// multer may decode UTF-8 filenames as Latin-1 on some systems.
// Heuristic: if name has Latin-1 supplement chars (0xC0-0xFF) but no Cyrillic, re-decode.
function fixFilename(name) {
  const hasLatin1High = /[\xC0-\xFF]/.test(name);
  const hasCyrillic = /[Ѐ-ӿ]/.test(name);
  if (hasLatin1High && !hasCyrillic) {
    try { return Buffer.from(name, 'latin1').toString('utf8'); } catch { /* ignore */ }
  }
  return name;
}

router.post('/upscale-image', upload.single('file'), async (req, res) => {
  const inputPath = req.file?.path;

  try {
    sweepDirectory(path.join(__dirname, '../../uploads'));
    sweepDirectory(compressedDir);

    if (!req.file) {
      return res.status(400).json({ error: 'NO_FILE', message: 'Файл не получен' });
    }

    const scaleRaw = parseInt(req.body.scale ?? '2', 10);
    const scale = [2, 3, 4].includes(scaleRaw) ? scaleRaw : 2;
    const mode = ['soft', 'balance', 'sharp'].includes(req.body.mode) ? req.body.mode : 'balance';
    const outputFormat = req.body.format === 'png' ? 'png' : 'webp';
    const sharpen = SHARPEN_PRESETS[mode];

    const outputFileName = `${uuidv4()}.${outputFormat}`;
    const outputPath = path.join(compressedDir, outputFileName);

    const meta = await sharp(inputPath).metadata();
    const newWidth = Math.round(meta.width * scale);
    const newHeight = Math.round(meta.height * scale);

    let pipeline = sharp(inputPath)
      .resize(newWidth, newHeight, { kernel: sharp.kernel.lanczos3 })
      .sharpen({ sigma: sharpen.sigma, m1: sharpen.m1, m2: sharpen.m2 });

    // Extra contrast normalisation for maximum sharpness mode
    if (mode === 'sharp') pipeline = pipeline.normalise();

    if (outputFormat === 'webp') {
      pipeline = pipeline.webp({ quality: 90, effort: 4 });
    } else {
      pipeline = pipeline.png({ compressionLevel: 6 });
    }

    await pipeline.toFile(outputPath);

    const originalSize = req.file.size;
    const resultSize = fs.statSync(outputPath).size;
    const originalName = fixFilename(req.file.originalname);

    deleteFile(inputPath);

    res.json({
      success: true,
      originalName,
      originalSize,
      resultSize,
      scale,
      format: outputFormat,
      downloadUrl: `/download/${outputFileName}`,
      fileName: outputFileName,
    });
  } catch (err) {
    deleteFile(inputPath);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'FILE_TOO_LARGE', message: 'Файл превышает 25 МБ' });
    }
    console.error('Upscale error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Ошибка обработки файла' });
  }
});

module.exports = router;
