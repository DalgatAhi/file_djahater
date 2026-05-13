const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const upload = require('../middleware/upload');
const { deleteFile, sweepDirectory } = require('../utils/cleanup');

const compressedDir = path.join(__dirname, '../../compressed');

// Cache the ESM import so we pay the dynamic-import cost only once
let _removeBackground = null;

async function getRemoveBg() {
  if (_removeBackground) return _removeBackground;
  console.log('[remove-bg] Loading @imgly/background-removal-node…');
  const mod = await import('@imgly/background-removal-node');
  _removeBackground = mod.removeBackground;
  console.log('[remove-bg] Module ready.');
  return _removeBackground;
}

// Decode filenames that multer mis-read as Latin-1 instead of UTF-8
function fixFilename(name) {
  const hasLatin1High = /[\xC0-\xFF]/.test(name);
  const hasCyrillic = /[Ѐ-ӿ]/.test(name);
  if (hasLatin1High && !hasCyrillic) {
    try { return Buffer.from(name, 'latin1').toString('utf8'); } catch { /* ignore */ }
  }
  return name;
}

// «product photo.jpg» → «product_photo_no_bg.png»
function buildNoBgName(originalName) {
  const nameWithoutExt = originalName.replace(/\.[^.]+$/, '');
  const safe = nameWithoutExt
    .replace(/\s+/g, '_')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '');
  return `${safe}_no_bg.png`;
}

router.post('/remove-background', upload.single('file'), async (req, res) => {
  const inputPath = req.file?.path;

  try {
    sweepDirectory(path.join(__dirname, '../../uploads'));
    sweepDirectory(compressedDir);

    if (!req.file) {
      return res.status(400).json({ error: 'NO_FILE', message: 'Файл не получен' });
    }

    const removeBg = await getRemoveBg();
    const outputFileName = `${uuidv4()}.png`;
    const outputPath = path.join(compressedDir, outputFileName);

    // Pass image as Uint8Array — works reliably across Node versions
    const imageData = fs.readFileSync(inputPath);
    const uint8Array = new Uint8Array(imageData.buffer, imageData.byteOffset, imageData.byteLength);

    const resultBlob = await removeBg(uint8Array, {
      model: 'medium',       // 'small' = faster, 'medium' = higher quality
      output: {
        format: 'image/png',
        quality: 1.0,
        type: 'foreground',  // keep subject, remove background
      },
    });

    if (!resultBlob || resultBlob.size === 0) {
      throw new Error('EMPTY_RESULT');
    }

    const buffer = Buffer.from(await resultBlob.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    const originalName = fixFilename(req.file.originalname);
    const originalSize = req.file.size;
    const resultSize = fs.statSync(outputPath).size;

    deleteFile(inputPath);

    res.json({
      success: true,
      originalName,
      downloadName: buildNoBgName(originalName),
      originalSize,
      resultSize,
      downloadUrl: `/download/${outputFileName}`,
      fileName: outputFileName,
    });
  } catch (err) {
    deleteFile(inputPath);

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'FILE_TOO_LARGE', message: 'Файл превышает 25 МБ' });
    }
    if (err.message === 'EMPTY_RESULT') {
      return res.status(422).json({
        error: 'PROCESS_FAILED',
        message: 'Не удалось удалить фон. Попробуйте другое изображение.',
      });
    }

    console.error('[remove-bg] Error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Ошибка удаления фона. Попробуйте ещё раз.' });
  }
});

module.exports = router;
