const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const uploadVideo = require('../middleware/upload-video');
const { deleteFile, sweepDirectory } = require('../utils/cleanup');

ffmpeg.setFfmpegPath(ffmpegPath);

const compressedDir = path.join(__dirname, '../../compressed');

// multer may decode UTF-8 filenames as Latin-1 on some systems.
function fixFilename(name) {
  const hasLatin1High = /[\xC0-\xFF]/.test(name);
  const hasCyrillic = /[Ѐ-ӿ]/.test(name);
  if (hasLatin1High && !hasCyrillic) {
    try { return Buffer.from(name, 'latin1').toString('utf8'); } catch { /* ignore */ }
  }
  return name;
}

// CRF: lower = better quality, larger file
// ffmpegPreset: ultrafast→faster→medium→slow (speed vs compression tradeoff)
const PRESETS = {
  max:      { crf: 30, scaleHeight: 720,  audioBitrate: '64k',  ffmpegPreset: 'faster' },
  balanced: { crf: 23, scaleHeight: 1080, audioBitrate: '128k', ffmpegPreset: 'medium' },
  high:     { crf: 18, scaleHeight: null, audioBitrate: '192k', ffmpegPreset: 'slow'   },
};

// In-memory job registry (jobId → job state)
const jobs = new Map();

// POST /api/compress-video — upload + start async compression
router.post('/compress-video', (req, res, next) => {
  // Wrap multer to intercept its own errors (size/format)
  uploadVideo.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'FILE_TOO_LARGE', message: 'Видео превышает 200 МБ' });
      }
      if (err.message === 'UNSUPPORTED_VIDEO_FORMAT') {
        return res.status(415).json({ error: 'UNSUPPORTED_FORMAT', message: 'Неподдерживаемый формат. Принимаются MP4, MOV, WebM.' });
      }
      return res.status(500).json({ error: 'UPLOAD_ERROR', message: 'Ошибка загрузки файла' });
    }
    next();
  });
}, (req, res) => {
  sweepDirectory(path.join(__dirname, '../../uploads'));
  sweepDirectory(compressedDir);

  if (!req.file) {
    return res.status(400).json({ error: 'NO_FILE', message: 'Файл не получен' });
  }

  const { mode = 'balanced' } = req.body;
  const preset = PRESETS[mode] || PRESETS.balanced;
  const jobId = uuidv4();
  const inputPath = req.file.path;
  const outputFileName = `${uuidv4()}.mp4`;
  const outputPath = path.join(compressedDir, outputFileName);

  const job = {
    status: 'processing',
    progress: 0,
    result: null,
    error: null,
    command: null,
  };
  jobs.set(jobId, job);

  // Build ffmpeg pipeline
  let cmd = ffmpeg(inputPath)
    .outputOptions([
      '-c:v libx264',
      `-crf ${preset.crf}`,
      `-preset ${preset.ffmpegPreset}`,
      '-c:a aac',
      `-b:a ${preset.audioBitrate}`,
      '-movflags +faststart', // optimize for web streaming
      '-y',
    ]);

  // Scale down only when a max height is defined; -2 keeps aspect ratio with even pixels
  if (preset.scaleHeight) {
    cmd = cmd.videoFilter(`scale=-2:min(${preset.scaleHeight}\\,ih)`);
  }

  job.command = cmd;

  cmd
    .output(outputPath)
    .on('progress', (p) => {
      const pct = parseFloat(p.percent);
      if (!isNaN(pct)) {
        job.progress = Math.min(Math.round(pct), 99);
      }
    })
    .on('end', () => {
      const compressedSize = fs.statSync(outputPath).size;
      job.status = 'done';
      job.progress = 100;
      job.result = {
        originalName: fixFilename(req.file.originalname),
        originalSize: req.file.size,
        compressedSize,
        savings: Math.round(((req.file.size - compressedSize) / req.file.size) * 100),
        downloadUrl: `/download/${outputFileName}`,
        fileName: outputFileName,
        format: 'MP4',
      };
      deleteFile(inputPath);
      // Auto-remove job from memory after 10 minutes
      setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
    })
    .on('error', (err) => {
      console.error('FFmpeg error:', err.message);
      job.status = 'error';
      job.error = 'Ошибка обработки видео';
      deleteFile(inputPath);
    })
    .run();

  res.json({ jobId });
});

// GET /api/progress/:jobId — Server-Sent Events stream
router.get('/progress/:jobId', (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering if behind proxy
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const tick = () => {
    const job = jobs.get(jobId);
    if (!job) {
      send({ status: 'error', error: 'Задача не найдена' });
      return cleanup();
    }

    send({ status: job.status, progress: job.progress, result: job.result, error: job.error });

    if (job.status === 'done' || job.status === 'error') {
      cleanup();
    }
  };

  const interval = setInterval(tick, 400);
  tick(); // send immediately

  function cleanup() {
    clearInterval(interval);
    res.end();
  }

  // If client disconnects, cancel the ffmpeg process
  req.on('close', () => {
    clearInterval(interval);
    const job = jobs.get(jobId);
    if (job?.status === 'processing' && job.command) {
      try { job.command.kill('SIGKILL'); } catch { /* ignore */ }
    }
  });
});

module.exports = router;
