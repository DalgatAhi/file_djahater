const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const YTDlpWrap = require('yt-dlp-wrap').default;
const { sweepDirectory } = require('../utils/cleanup');

const compressedDir = path.join(__dirname, '../../compressed');
const ytDlpBinary = path.join(__dirname, '../../yt-dlp');

// Write YouTube cookies from env var to temp file once at startup
const COOKIES_PATH = path.join(os.tmpdir(), 'yt-cookies.txt');
if (process.env.YOUTUBE_COOKIES) {
  try {
    const decoded = Buffer.from(process.env.YOUTUBE_COOKIES, 'base64').toString('utf8');
    fs.writeFileSync(COOKIES_PATH, decoded, 'utf8');
    console.log('YouTube cookies loaded from env');
  } catch (e) {
    console.error('Failed to write YouTube cookies:', e.message);
  }
}

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
  best:  'bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best',
  '720p': 'bestvideo[vcodec^=avc1][height<=720]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best',
  '480p': 'bestvideo[vcodec^=avc1][height<=480]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]/best',
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

    const isTikTok   = /tiktok\.com/i.test(trimmedUrl);
    const isYouTube  = /youtube\.com|youtu\.be/i.test(trimmedUrl);

    const args = [
      trimmedUrl,
      '-f', fmt,
      '-S', 'vcodec:h264,ext:mp4',
      '-o', outputPath,
      '--no-playlist',
      '--no-warnings',
      '--newline',
      '--merge-output-format', 'mp4',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      '--add-header', 'Accept-Language:en-US,en;q=0.9',
    ];

    if (isTikTok) {
      args.push(
        '--add-header', 'Referer:https://www.tiktok.com/',
        '--extractor-args', 'tiktok:api_hostname=api22-normal-c-useast2a.tiktokv.com',
      );
    }

    if (isYouTube) {
      // iOS client bypasses datacenter IP blocks that affect the default web client
      args.push('--extractor-args', 'youtube:player_client=ios,mweb,web');
      // Use cookies if provided via YOUTUBE_COOKIES env var (base64-encoded Netscape cookies)
      if (fs.existsSync(COOKIES_PATH)) {
        args.push('--cookies', COOKIES_PATH);
      }
    }

    const emitter = yt.exec(args);

    job.emitter = emitter;

    const stderrLines = [];

    emitter.on('ytDlpEvent', (eventType, eventData) => {
      if (eventType === 'download') {
        const match = eventData.match(/(\d+\.?\d*)%/);
        if (match) job.progress = Math.min(Math.round(parseFloat(match[1])), 99);
      }
      stderrLines.push(eventData);
    });

    emitter.on('error', (err) => {
      const fullOutput = [...stderrLines, err.message].join('\n');
      console.error('yt-dlp error:', fullOutput);
      job.status = 'error';
      job.error = detectError(fullOutput, trimmedUrl);
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
    job.error = detectError(err.message, trimmedUrl);
    setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
  }
});

function detectError(msg = '', url = '') {
  const m = msg.toLowerCase();
  const isYT = /youtube\.com|youtu\.be/i.test(url);

  if (m.includes('sign in') || m.includes('bot') || m.includes('captcha') || m.includes('confirm your age'))
    return isYT
      ? 'YouTube заблокировал запрос с сервера. Попробуйте добавить cookies через переменную YOUTUBE_COOKIES в Railway.'
      : 'Доступ заблокирован или требуется авторизация. Попробуйте другое видео.';
  if (m.includes('403'))
    return isYT
      ? 'YouTube вернул ошибку 403 (блокировка по IP сервера). Попробуйте другое качество или добавьте cookies.'
      : 'Сервер платформы запретил доступ (403). Попробуйте позже.';
  if (m.includes('private'))
    return 'Видео приватное или недоступно';
  if (m.includes('not available') || m.includes('removed') || m.includes('no longer'))
    return 'Видео удалено или недоступно в вашем регионе';
  if (m.includes('age') || m.includes('18+'))
    return 'Видео с возрастным ограничением';
  if (m.includes('unsupported url'))
    return 'Этот сайт не поддерживается';
  if (m.includes('unable to extract') || m.includes('unable to download'))
    return 'Не удалось извлечь видео. Возможно, сайт изменил защиту.';
  if (m.includes('network') || m.includes('connect') || m.includes('timeout'))
    return 'Ошибка сети. Попробуйте ещё раз.';
  if (m.includes('http error'))
    return 'Сервер платформы вернул ошибку. Попробуйте позже.';
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
