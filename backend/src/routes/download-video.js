const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const YTDlpWrap = require('yt-dlp-wrap').default;
const { sweepDirectory } = require('../utils/cleanup');

const compressedDir = path.join(__dirname, '../../compressed');
const ytDlpBinary = path.join(__dirname, '../../yt-dlp');

let ytDlp = null;

async function getYtDlp() {
  if (ytDlp) return ytDlp;
  const systemPath = process.env.YTDLP_PATH || 'yt-dlp';
  try {
    // Try system-installed yt-dlp first (Docker/Railway)
    const test = new YTDlpWrap(systemPath);
    await test.getVersion();
    ytDlp = test;
  } catch {
    // Fall back to auto-downloaded binary (local dev)
    if (!fs.existsSync(ytDlpBinary)) {
      console.log('Downloading yt-dlp binary...');
      await YTDlpWrap.downloadFromGithub(ytDlpBinary);
    }
    ytDlp = new YTDlpWrap(ytDlpBinary);
  }
  return ytDlp;
}

const QUALITY_FORMATS = {
  best:  'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
  '720p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]',
  '480p': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[height<=480]',
};

const jobs = new Map();

// POST /api/download-video
router.post('/download-video', express.json(), async (req, res) => {
  sweepDirectory(compressedDir);

  const { url, quality = 'best' } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'NO_URL', message: 'URL не указан' });
  }

  const trimmedUrl = url.trim();
  if (!/^https?:\/\/.+/.test(trimmedUrl)) {
    return res.status(400).json({ error: 'INVALID_URL', message: 'Некорректный URL' });
  }

  const jobId = uuidv4();
  const outputFileName = `${uuidv4()}.mp4`;
  const outputPath = path.join(compressedDir, outputFileName);
  const fmt = QUALITY_FORMATS[quality] || QUALITY_FORMATS.best;

  const job = { status: 'processing', progress: 0, result: null, error: null, emitter: null };
  jobs.set(jobId, job);

  res.json({ jobId });

  // Start download async
  try {
    const yt = await getYtDlp();

    // First get video info
    let videoTitle = 'video';
    try {
      const info = await yt.getVideoInfo(trimmedUrl);
      videoTitle = info.title || 'video';
      if (info.duration && info.duration > 1800) {
        job.status = 'error';
        job.error = 'Видео слишком длинное (более 30 минут)';
        return;
      }
    } catch { /* proceed without info */ }

    const emitter = yt.exec([
      trimmedUrl,
      '-f', fmt,
      '-o', outputPath,
      '--no-playlist',
      '--no-warnings',
      '--newline',
      '--merge-output-format', 'mp4',
    ]);

    job.emitter = emitter;

    emitter.on('ytDlpEvent', (eventType, eventData) => {
      if (eventType === 'download') {
        const match = eventData.match(/(\d+\.?\d*)%/);
        if (match) job.progress = Math.min(Math.round(parseFloat(match[1])), 99);
      }
    });

    emitter.on('error', (err) => {
      console.error('yt-dlp error:', err.message);
      job.status = 'error';
      job.error = detectError(err.message);
      setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
    });

    emitter.on('close', () => {
      if (job.status === 'error') return;
      if (!fs.existsSync(outputPath)) {
        job.status = 'error';
        job.error = 'Не удалось получить видео. Проверьте ссылку.';
        return;
      }
      const fileSize = fs.statSync(outputPath).size;
      job.status = 'done';
      job.progress = 100;
      job.result = {
        title: videoTitle,
        fileSize,
        downloadUrl: `/download/${outputFileName}`,
        fileName: outputFileName,
        quality,
      };
      setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
    });
  } catch (err) {
    console.error('Download error:', err.message);
    job.status = 'error';
    job.error = detectError(err.message);
    setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
  }
});

function detectError(msg = '') {
  if (msg.includes('Private') || msg.includes('private'))      return 'Видео приватное или недоступно';
  if (msg.includes('not available') || msg.includes('removed')) return 'Видео удалено или недоступно в вашем регионе';
  if (msg.includes('age'))                                      return 'Видео с возрастным ограничением';
  if (msg.includes('Unsupported URL') || msg.includes('Unable')) return 'Этот сайт не поддерживается';
  if (msg.includes('network') || msg.includes('connect'))       return 'Ошибка сети. Попробуйте ещё раз.';
  return 'Не удалось скачать видео. Проверьте ссылку.';
}

// GET /api/download-video/progress/:jobId — SSE
router.get('/download-video/progress/:jobId', (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const tick = () => {
    const job = jobs.get(jobId);
    if (!job) { send({ status: 'error', error: 'Задача не найдена' }); return cleanup(); }
    send({ status: job.status, progress: job.progress, result: job.result, error: job.error });
    if (job.status === 'done' || job.status === 'error') cleanup();
  };

  const interval = setInterval(tick, 400);
  tick();

  function cleanup() { clearInterval(interval); res.end(); }

  req.on('close', () => {
    clearInterval(interval);
    const job = jobs.get(jobId);
    if (job?.status === 'processing' && job.emitter) {
      try { job.emitter.kill(); } catch { /* ignore */ }
    }
  });
});

module.exports = router;
