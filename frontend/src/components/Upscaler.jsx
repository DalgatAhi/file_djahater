import { useState, useRef, useCallback } from 'react';
import UploadZone from './UploadZone';
import CompareSlider from './CompareSlider';
import {
  X, ImageIcon, Wand2, Download, CheckCircle2,
  Loader2, RefreshCw, ZoomIn,
} from 'lucide-react';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

function buildResultName(originalName, format) {
  const nameWithoutExt = originalName.replace(/\.[^.]+$/, '');
  const safe = nameWithoutExt
    .replace(/\s+/g, '_')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '');
  return `${safe}_result.${format}`;
}

const SCALES = [
  { id: 2, label: '×2' },
  { id: 3, label: '×3' },
  { id: 4, label: '×4' },
];

const MODES = [
  { id: 'soft',    label: 'Мягкое улучшение',    desc: 'Плавно, без артефактов' },
  { id: 'balance', label: 'Баланс',               desc: 'Оптимально' },
  { id: 'sharp',   label: 'Максимальная резкость', desc: 'Чёткие детали' },
];

export default function Upscaler() {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null); // object URL for original image
  const [scale, setScale]         = useState(2);
  const [mode, setMode]           = useState('balance');
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');

  const previewUrlRef = useRef(null);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const handleFileSelect = useCallback((f) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(f);
    previewUrlRef.current = url;
    setFile(f);
    setPreview(url);
    setResult(null);
    setError('');
  }, []);

  const handleReset = () => {
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    setLoading(false);
  };

  const handleUpscale = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('scale', String(scale));
      formData.append('mode', mode);
      formData.append('format', 'webp');

      const res = await fetch('/api/upscale-image', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        const msgs = {
          UNSUPPORTED_FORMAT: 'Неподдерживаемый формат файла.',
          FILE_TOO_LARGE: 'Файл превышает 25 МБ.',
          SERVER_ERROR: 'Ошибка сервера. Попробуйте ещё раз.',
        };
        throw new Error(msgs[data.error] || data.message || 'Неизвестная ошибка');
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'Не удалось связаться с сервером.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    const filename = result.downloadUrl.split('/').pop();
    const dlFilename = buildResultName(result.originalName, result.format);
    const cleanup = () => setTimeout(() => fetch(`/api/file/${filename}`, { method: 'DELETE' }).catch(() => {}), 2000);

    if (isIOS) {
      setSaving(true);
      try {
        const blob = await fetch(result.downloadUrl).then(r => r.blob());
        const shareFile = new File([blob], dlFilename, { type: 'image/webp' });
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
      window.open(result.downloadUrl, '_blank');
      cleanup();
      return;
    }

    const a = document.createElement('a');
    a.href = result.downloadUrl;
    a.download = dlFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    cleanup();
  };

  return (
    <div className="space-y-6">
      {/* Upload + settings row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Upload zone or preview */}
        <div className="glass rounded-3xl p-4 sm:p-6 flex flex-col gap-5">
          {!file ? (
            <UploadZone onFileSelect={handleFileSelect} error={error} />
          ) : (
            <div className="relative group">
              <div className="rounded-2xl overflow-hidden bg-black/20 aspect-video flex items-center justify-center relative">
                <img
                  src={preview}
                  alt="Предпросмотр"
                  className="max-h-60 max-w-full object-contain"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-2xl">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    Изменить файл
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <ImageIcon size={14} className="text-muted shrink-0" />
                  <span className="text-sm text-white truncate">{file.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted">{formatBytes(file.size)}</span>
                  <button onClick={handleReset} className="text-muted hover:text-red-400 transition-colors">
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && !file && (
            <div className="p-3 rounded-xl text-sm text-red-400"
              style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Right: Settings or result info */}
        <div className="glass rounded-3xl p-4 sm:p-6">
          {result ? (
            /* Result info card */
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(0,210,100,0.15)', border: '1px solid rgba(0,210,100,0.3)' }}>
                  <CheckCircle2 size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Улучшено!</p>
                  <p className="text-muted text-xs">×{result.scale} — файл готов к скачиванию</p>
                </div>
              </div>

              {/* File name */}
              <div className="flex items-center gap-2 mb-5 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <ImageIcon size={14} className="text-muted shrink-0" />
                <span className="text-sm text-white truncate">{result.originalName}</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full uppercase font-semibold shrink-0"
                  style={{ background: 'rgba(108,92,231,0.2)', color: '#6C5CE7' }}>
                  {result.format}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="text-center p-4 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xs text-muted mb-1">Оригинал</p>
                  <p className="text-base font-bold text-white">{formatBytes(result.originalSize)}</p>
                </div>
                <div className="text-center p-4 rounded-2xl"
                  style={{ background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.25)' }}>
                  <p className="text-xs text-muted mb-1">Увеличено ×{result.scale}</p>
                  <p className="text-base font-bold text-accent">{formatBytes(result.resultSize)}</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  disabled={saving}
                  className="btn-primary flex-1 justify-center py-3.5 rounded-2xl text-sm"
                >
                  {saving ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
                  {saving ? 'Подготовка...' : 'Скачать улучшенное фото'}
                </button>
                <button
                  onClick={handleReset}
                  className="btn-secondary px-4 rounded-2xl"
                  title="Улучшить другое фото"
                >
                  <RefreshCw size={17} />
                </button>
              </div>
            </div>
          ) : (
            /* Settings panel */
            <div className="space-y-6">
              {/* Scale selection */}
              <div>
                <p className="text-sm font-semibold text-white mb-3">Масштаб увеличения</p>
                <div className="flex gap-3">
                  {SCALES.map(s => {
                    const active = scale === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setScale(s.id)}
                        className="flex-1 py-4 rounded-2xl border text-sm font-bold transition-all duration-200"
                        style={{
                          background: active ? 'rgba(108,92,231,0.2)' : 'rgba(255,255,255,0.04)',
                          borderColor: active ? 'rgba(108,92,231,0.6)' : 'rgba(255,255,255,0.1)',
                          color: active ? '#ffffff' : '#A7B0C0',
                          boxShadow: active ? '0 0 0 1px rgba(108,92,231,0.3)' : 'none',
                        }}
                      >
                        <ZoomIn size={14} className="mx-auto mb-1.5" style={{ color: active ? '#6C5CE7' : '#A7B0C0' }} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Enhancement mode */}
              <div>
                <p className="text-sm font-semibold text-white mb-3">Режим улучшения</p>
                <div className="flex flex-col gap-2">
                  {MODES.map(m => {
                    const active = mode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200"
                        style={{
                          background: active ? 'rgba(108,92,231,0.15)' : 'rgba(255,255,255,0.04)',
                          borderColor: active ? 'rgba(108,92,231,0.5)' : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{
                            background: active
                              ? 'linear-gradient(135deg, #6C5CE7, #00D2FF)'
                              : 'rgba(255,255,255,0.2)',
                            boxShadow: active ? '0 0 8px rgba(108,92,231,0.6)' : 'none',
                          }}
                        />
                        <div>
                          <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}>
                            {m.label}
                          </p>
                          <p className="text-xs text-muted/70">{m.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action button */}
              <button
                onClick={handleUpscale}
                disabled={!file || loading}
                className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-300 relative overflow-hidden"
                style={{
                  background: (!file || loading)
                    ? 'rgba(255,255,255,0.06)'
                    : 'linear-gradient(135deg, #6C5CE7, #5a4bd1)',
                  color: (!file || loading) ? '#A7B0C0' : '#fff',
                  boxShadow: (!file || loading) ? 'none' : '0 6px 30px rgba(108,92,231,0.4)',
                  cursor: (!file || loading) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Улучшаем...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Wand2 size={18} />
                    Улучшить фото
                  </span>
                )}
                {file && !loading && (
                  <span className="absolute inset-0 shimmer-bg opacity-0 hover:opacity-100 transition-opacity duration-300" />
                )}
              </button>

              {error && file && (
                <div className="p-3 rounded-xl text-sm text-red-400"
                  style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compare slider — appears after upscaling */}
      {result && preview && (
        <div className="glass rounded-3xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-semibold text-white">Сравнение До / После</span>
            <span className="text-xs text-muted ml-auto">Перетащи разделитель</span>
          </div>
          <CompareSlider
            beforeSrc={preview}
            afterSrc={result.downloadUrl}
          />
        </div>
      )}
    </div>
  );
}
