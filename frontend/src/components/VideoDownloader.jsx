import { useState, useRef, useEffect } from 'react';
import {
  Link, Download, CheckCircle2, Loader2,
  Youtube, Music2, Instagram, Globe,
  Zap, Scale, Star, RefreshCw, Film,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

function detectPlatform(url) {
  if (!url) return null;
  if (/tiktok\.com/i.test(url))            return 'tiktok';
  if (/instagram\.com/i.test(url))         return 'instagram';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  return 'other';
}

const PLATFORM_META = {
  youtube:   { label: 'YouTube',   color: '#FF0000', Icon: Youtube   },
  tiktok:    { label: 'TikTok',    color: '#00D2FF', Icon: Music2    },
  instagram: { label: 'Instagram', color: '#E1306C', Icon: Instagram },
  other:     { label: 'Видео',     color: '#A7B0C0', Icon: Globe     },
};

const QUALITIES = [
  { id: 'best',  label: 'Лучшее',   hint: 'до 1080p', Icon: Star,  color: '#f39c12' },
  { id: '720p',  label: '720p HD',  hint: 'баланс',   Icon: Scale, color: '#6C5CE7' },
  { id: '480p',  label: '480p',     hint: 'быстро',   Icon: Zap,   color: '#00D2FF' },
];

// ── main component ────────────────────────────────────────────────────────────

export default function VideoDownloader() {
  const [url, setUrl]           = useState('');
  const [quality, setQuality]   = useState('best');
  const [status, setStatus]     = useState('idle'); // idle | loading | done | error
  const [progress, setProgress] = useState(0);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

  const esRef    = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => () => esRef.current?.close(), []);

  const platform = detectPlatform(url);
  const meta = platform ? PLATFORM_META[platform] : null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
    } catch { inputRef.current?.focus(); }
  };

  const handleReset = () => {
    esRef.current?.close();
    esRef.current = null;
    setUrl('');
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setError('');
  };

  const openSSE = (jobId) => {
    const es = new EventSource(`/api/download-video/progress/${jobId}`);
    esRef.current = es;

    es.onmessage = (e) => {
      const d = JSON.parse(e.data);
      setProgress(d.progress ?? 0);

      if (d.status === 'done') {
        setResult(d.result);
        setStatus('done');
        es.close(); esRef.current = null;
      } else if (d.status === 'error') {
        setError(d.error || 'Не удалось скачать видео');
        setStatus('error');
        es.close(); esRef.current = null;
      }
    };
    es.onerror = () => {
      setError('Соединение с сервером прервано.');
      setStatus('error');
      es.close(); esRef.current = null;
    };
  };

  const handleDownload = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus('loading');
    setProgress(0);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/download-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, quality }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msgs = {
          NO_URL:      'URL не указан',
          INVALID_URL: 'Некорректный URL',
        };
        setError(msgs[data.error] || data.message || 'Ошибка запроса');
        setStatus('error');
        return;
      }
      openSSE(data.jobId);
    } catch {
      setError('Не удалось связаться с сервером.');
      setStatus('error');
    }
  };

  const isLoading = status === 'loading';

  if (status === 'done' && result) {
    return <ResultPanel result={result} onReset={handleReset} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass rounded-3xl p-5 sm:p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.3)' }}>
            <Download size={26} style={{ color: '#6C5CE7' }} />
          </div>
          <h3 className="text-xl font-black text-white mb-1">Скачать видео</h3>
          <p className="text-sm text-muted">YouTube · TikTok · Instagram Reels и тысячи других сайтов</p>
        </div>

        {/* Supported platforms row */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-7">
          {[
            { label: 'YouTube',   color: '#FF0000', Icon: Youtube   },
            { label: 'TikTok',    color: '#00D2FF', Icon: Music2    },
            { label: 'Instagram', color: '#E1306C', Icon: Instagram },
          ].map(({ label, color, Icon }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: `${color}14`, border: `1px solid ${color}33`, color }}>
              <Icon size={12} />
              {label}
            </div>
          ))}
        </div>

        {/* URL input */}
        <div className="relative mb-5">
          <div
            className={`flex items-center rounded-2xl border transition-all duration-200 overflow-hidden
              ${isLoading
                ? 'border-purple-500/40 bg-purple-500/[0.06]'
                : url
                ? 'border-white/20 bg-white/[0.06]'
                : 'border-white/10 bg-white/[0.04]'
              }`}
          >
            {/* Platform icon */}
            <div className="pl-4 pr-2 shrink-0">
              {meta
                ? <meta.Icon size={18} style={{ color: meta.color }} />
                : <Link size={18} className="text-muted/50" />
              }
            </div>

            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && !isLoading && handleDownload()}
              placeholder="Вставьте ссылку на видео..."
              disabled={isLoading}
              className="flex-1 py-4 pr-3 bg-transparent text-sm text-white placeholder-muted/50 outline-none"
            />

            {/* Paste button */}
            {!url && !isLoading && (
              <button
                onClick={handlePaste}
                className="mr-3 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#A7B0C0', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Вставить
              </button>
            )}

            {/* Clear */}
            {url && !isLoading && (
              <button onClick={() => { setUrl(''); setError(''); }}
                className="mr-3 text-muted/40 hover:text-muted transition-colors shrink-0 text-lg leading-none">
                ×
              </button>
            )}
          </div>

          {/* Platform badge */}
          {meta && platform !== 'other' && (
            <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}>
              {meta.label} обнаружен
            </div>
          )}
        </div>

        {/* Quality selector */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted mb-2.5 uppercase tracking-wide">Качество</p>
          <div className="grid grid-cols-3 gap-2">
            {QUALITIES.map(({ id, label, hint, Icon: QIcon, color }) => {
              const active = quality === id;
              return (
                <button
                  key={id}
                  onClick={() => setQuality(id)}
                  disabled={isLoading}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border text-center transition-all duration-200
                    ${active
                      ? 'mode-card selected'
                      : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20'
                    }`}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: active ? `${color}22` : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${active ? color + '55' : 'rgba(255,255,255,0.1)'}`,
                    }}>
                    <QIcon size={13} style={{ color: active ? color : '#A7B0C0' }} />
                  </div>
                  <p className={`text-xs font-semibold ${active ? 'text-white' : 'text-muted'}`}>{label}</p>
                  <p className="text-[10px] text-muted/60">{hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress */}
        {isLoading && (
          <DownloadProgress progress={progress} />
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="mb-5 p-3 rounded-xl text-sm text-red-400 animate-fade-in"
            style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}>
            {error}
          </div>
        )}

        {/* CTA button */}
        {!isLoading && (
          <button
            onClick={handleDownload}
            disabled={!url.trim()}
            className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-300 relative overflow-hidden"
            style={{
              background: !url.trim()
                ? 'rgba(255,255,255,0.06)'
                : 'linear-gradient(135deg, #6C5CE7, #5a4bd1)',
              color: !url.trim() ? '#A7B0C0' : '#fff',
              boxShadow: !url.trim() ? 'none' : '0 6px 30px rgba(108,92,231,0.4)',
              cursor: !url.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Скачать видео
            {url.trim() && (
              <span className="absolute inset-0 shimmer-bg opacity-0 hover:opacity-100 transition-opacity duration-300" />
            )}
          </button>
        )}

        {/* Disclaimer */}
        <p className="text-center text-[11px] text-muted/40 mt-4">
          Используйте только для личных целей. Уважайте авторские права.
        </p>
      </div>
    </div>
  );
}

// ── Progress ──────────────────────────────────────────────────────────────────

function DownloadProgress({ progress }) {
  return (
    <div className="mb-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.3)' }}>
          <Loader2 size={13} style={{ color: '#6C5CE7' }} className="animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white">
            {progress === 0 ? 'Получаем информацию о видео...' : 'Скачиваем видео...'}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Зависит от размера и качества видео</p>
        </div>
        {progress > 0 && (
          <span className="text-sm font-bold shrink-0" style={{ color: '#6C5CE7' }}>{progress}%</span>
        )}
      </div>

      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        {progress === 0 ? (
          <div className="h-full rounded-full progress-bar" style={{ width: '100%', opacity: 0.5 }} />
        ) : (
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6C5CE7, #00D2FF, #6C5CE7)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s linear infinite',
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Result ────────────────────────────────────────────────────────────────────

function ResultPanel({ result, onReset }) {
  const [saving, setSaving] = useState(false);
  const { title, fileSize, downloadUrl, quality } = result;
  const qualityLabel = { best: 'Лучшее качество', '720p': '720p HD', '480p': '480p' }[quality] || quality;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const safeTitle = (title || 'video').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, '_').slice(0, 80);
  const dlFilename = `${safeTitle}.mp4`;

  const handleDownload = async () => {
    const filename = downloadUrl.split('/').pop();
    const cleanup = () => setTimeout(() => fetch(`/api/file/${filename}`, { method: 'DELETE' }).catch(() => {}), 2000);

    if (isIOS) {
      setSaving(true);
      try {
        const blob = await fetch(downloadUrl).then(r => r.blob());
        const shareFile = new File([blob], dlFilename, { type: 'video/mp4' });
        if (navigator.canShare?.({ files: [shareFile] })) {
          await navigator.share({ files: [shareFile] });
          cleanup();
          return;
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
      } finally {
        setSaving(false);
      }
      window.open(downloadUrl, '_blank');
      cleanup();
      return;
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = dlFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    cleanup();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass rounded-3xl p-5 sm:p-8 animate-fade-up" style={{ opacity: 0 }}>

        {/* Success */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,210,100,0.15)', border: '1px solid rgba(0,210,100,0.3)' }}>
            <CheckCircle2 size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Готово!</p>
            <p className="text-muted text-xs">Видео успешно загружено</p>
          </div>
        </div>

        {/* Video title */}
        <div className="flex items-start gap-2 mb-5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <Film size={14} className="text-muted shrink-0 mt-0.5" />
          <span className="text-sm text-white leading-snug line-clamp-2">{title || 'Видео'}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="text-center p-4 rounded-2xl"
            style={{ background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)' }}>
            <p className="text-xs text-muted mb-1">Качество</p>
            <p className="text-base font-bold" style={{ color: '#6C5CE7' }}>{qualityLabel}</p>
          </div>
          <div className="text-center p-4 rounded-2xl"
            style={{ background: 'rgba(0,210,255,0.08)', border: '1px solid rgba(0,210,255,0.2)' }}>
            <p className="text-xs text-muted mb-1">Размер</p>
            <p className="text-base font-bold" style={{ color: '#00D2FF' }}>{formatBytes(fileSize)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={saving}
            className="btn-primary flex-1 justify-center py-4 rounded-2xl text-sm"
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
            {saving ? 'Подготовка...' : 'Скачать MP4'}
          </button>
          <button onClick={onReset} className="btn-secondary px-4 rounded-2xl" title="Скачать другое видео">
            <RefreshCw size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
