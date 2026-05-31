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

function fixFilename(name) {
  const hasLatin1High = /[\xC0-\xFF]/.test(name);
  const hasCyrillic = /[Ѐ-ӿ]/.test(name);
  if (hasLatin1High && !hasCyrillic) {
    try { return Buffer.from(name, 'latin1').toString('utf8'); } catch { /* ignore */ }
  }
  return name;
}

const FORMATS = {
  mp3: {
    ext: 'mp3',
    codec: 'libmp3lame',
    label: 'MP3',
    qualities: {
      low:    { bitrate: '96k'  },
      medium: { bitrate: '192k' },
      high:   { bitrate: '320k' },
    },
  },
  m4a: {
    ext: 'm4a',
    codec: 'aac',
    label: 'M4A',
    qualities: {
      low:    { bitrate: '96k'  },
      medium: { bitrate: '192k' },
      high:   { bitrate: '256k' },
    },
  },
  wav: {
    ext: 'wav',
    codec: 'pcm_s16le',
    label: 'WAV',
    qualities: {
      low:    { bitrate: null },
      medium: { bitrate: null },
      high:   { bitrate: null },
    },
  },
  ogg: {
    ext: 'ogg',
    codec: 'libvorbis',
    label: 'OGG',
    qualities: {
      low:    { bitrate: '96k'  },
      medium: { bitrate: '192k' },
      high:   { bitrate: '320k' },
    },
  },
};

const jobs = new Map();

// POST /api/extract-audio — upload video + start async audio extraction
router.post('/extract-audio', (req, res, next) => {
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

  const { format = 'mp3', quality = 'medium' } = req.body;
  const fmt = FORMATS[format] || FORMATS.mp3;
  const qualityConfig = fmt.qualities[quality] || fmt.qualities.medium;

  const jobId = uuidv4();
  const inputPath = req.file.path;
  const outputFileName = `${uuidv4()}.${fmt.ext}`;
  const outputPath = path.join(compressedDir, outputFileName);

  const job = { status: 'processing', progress: 0, result: null, error: null, command: null };
  jobs.set(jobId, job);

  const outputOptions = ['-vn', `-c:a ${fmt.codec}`, '-y'];
  if (qualityConfig.bitrate) outputOptions.push(`-b:a ${qualityConfig.bitrate}`);

  const cmd = ffmpeg(inputPath)
    .outputOptions(outputOptions)
    .output(outputPath);

  job.command = cmd;

  cmd
    .on('progress', (p) => {
      const pct = parseFloat(p.percent);
      if (!isNaN(pct)) job.progress = Math.min(Math.round(pct), 99);
    })
    .on('end', () => {
      const audioSize = fs.statSync(outputPath).size;
      job.status = 'done';
      job.progress = 100;
      job.result = {
        originalName: fixFilename(req.file.originalname),
        originalSize: req.file.size,
        audioSize,
        downloadUrl: `/download/${outputFileName}`,
        fileName: outputFileName,
        format: fmt.label,
        quality,
      };
      deleteFile(inputPath);
      setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
    })
    .on('error', (err) => {
      console.error('FFmpeg audio extraction error:', err.message);
      job.status = 'error';
      job.error = 'Ошибка извлечения аудио';
      deleteFile(inputPath);
    })
    .run();

  res.json({ jobId });
});

// GET /api/extract-audio/progress/:jobId — SSE progress stream
router.get('/extract-audio/progress/:jobId', (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const tick = () => {
    const job = jobs.get(jobId);
    if (!job) {
      send({ status: 'error', error: 'Задача не найдена' });
      return cleanup();
    }
    send({ status: job.status, progress: job.progress, result: job.result, error: job.error });
    if (job.status === 'done' || job.status === 'error') cleanup();
  };

  const interval = setInterval(tick, 400);
  tick();

  function cleanup() {
    clearInterval(interval);
    res.end();
  }

  req.on('close', () => {
    clearInterval(interval);
    const job = jobs.get(jobId);
    if (job?.status === 'processing' && job.command) {
      try { job.command.kill('SIGKILL'); } catch { /* ignore */ }
    }
  });
});

module.exports = router;
