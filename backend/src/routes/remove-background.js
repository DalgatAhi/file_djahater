const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const upload = require('../middleware/upload');
const { deleteFile, sweepDirectory } = require('../utils/cleanup');

const compressedDir = path.join(__dirname, '../../compressed');

// Cache the ESM import so the dynamic-import cost is paid only once
let _removeBackground = null;

async function getRemoveBg() {
  if (_removeBackground) return _removeBackground;
  console.log('[remove-bg] Loading @imgly/background-removal-node…');
  const mod = await import('@imgly/background-removal-node');
  _removeBackground = mod.removeBackground;
  console.log('[remove-bg] Module ready.');
  return _removeBackground;
}

// Convert any result type (Blob | ArrayBuffer | Buffer) to a Node.js Buffer
async function toBuffer(result) {
  if (!result) throw new Error('EMPTY_RESULT');

  // Blob (the usual return type from @imgly/background-removal-node)
  if (typeof result.arrayBuffer === 'function') {
    const ab = await result.arrayBuffer();
    return Buffer.from(ab);
  }

  // ArrayBuffer
  if (result instanceof ArrayBuffer || result instanceof SharedArrayBuffer) {
    return Buffer.from(result);
  }

  // Node.js Buffer or Uint8Array
  if (Buffer.isBuffer(result) || result instanceof Uint8Array) {
    return Buffer.from(result);
  }

  throw new Error(`UNKNOWN_RESULT_TYPE: ${result?.constructor?.name}`);
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

    console.log('[remove-bg] Processing:', req.file.originalname, '|', req.file.size, 'bytes');

    const removeBg = await getRemoveBg();
    const outputFileName = `${uuidv4()}.png`;
    const outputPath = path.join(compressedDir, outputFileName);

    // Pass the image as a file:// URL — the only input format reliably
    // supported by @imgly/background-removal-node in a Node.js environment.
    // Uint8Array / ArrayBuffer cause "Unsupported format" errors in this library.
    const fileUrl = `file://${inputPath}`;

    const rawResult = await removeBg(fileUrl, {
      model: 'medium',      // 'small' = faster (~40 MB), 'medium' = better quality (~100 MB)
      output: {
        format: 'image/png',
        quality: 1.0,
        type: 'foreground', // keep subject, discard background
      },
    });

    const buffer = await toBuffer(rawResult);

    if (buffer.length === 0) throw new Error('EMPTY_RESULT');

    fs.writeFileSync(outputPath, buffer);

    const originalName = fixFilename(req.file.originalname);
    const originalSize = req.file.size;
    const resultSize = fs.statSync(outputPath).size;

    deleteFile(inputPath);

    console.log('[remove-bg] Done:', buildNoBgName(originalName), '|', resultSize, 'bytes');

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

    console.error('[remove-bg] Error:', err.message);
    console.error('[remove-bg] Stack:', err.stack?.split('\n').slice(0, 4).join('\n'));

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'FILE_TOO_LARGE', message: 'Файл превышает 25 МБ' });
    }
    if (err.message === 'EMPTY_RESULT' || err.message?.startsWith('UNKNOWN_RESULT_TYPE')) {
      return res.status(422).json({
        error: 'PROCESS_FAILED',
        message: 'Не удалось удалить фон. Попробуйте другое изображение.',
      });
    }

    res.status(500).json({
      error: 'SERVER_ERROR',
      message: `Ошибка удаления фона: ${err.message}`,
    });
  }
});

module.exports = router;
