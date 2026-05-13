import { useState, useRef, useCallback } from 'react';
import UploadZone from './UploadZone';
import CompareSlider from './CompareSlider';
import {
  X, ImageIcon, Eraser, Download, CheckCircle2,
  Loader2, RefreshCw, AlertCircle, Layers,
} from 'lucide-react';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

// Classic grey/white checkerboard — makes transparent areas obvious
const CHECKERBOARD = {
  backgroundImage: [
    'linear-gradient(45deg, #aaa 25%, transparent 25%)',
    'linear-gradient(-45deg, #aaa 25%, transparent 25%)',
    'linear-gradient(45deg, transparent 75%, #aaa 75%)',
    'linear-gradient(-45deg, transparent 75%, #aaa 75%)',
  ].join(', '),
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
  backgroundColor: '#c8c8c8',
};

export default function BackgroundRemover() {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  const previewUrlRef = useRef(null);

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

  const handleRemove = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/remove-background', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        const msgs = {
          UNSUPPORTED_FORMAT: 'Неподдерживаемый формат файла.',
          FILE_TOO_LARGE:     'Файл превышает 25 МБ.',
          PROCESS_FAILED:     'Не удалось удалить фон. Попробуйте другое изображение.',
          SERVER_ERROR:       'Ошибка сервера. Попробуйте ещё раз.',
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

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.downloadUrl;
    a.download = result.downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      const filename = result.downloadUrl.split('/').pop();
      fetch(`/api/file/${filename}`, { method: 'DELETE' }).catch(() => {});
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left: upload zone or image preview ── */}
        <div className="glass rounded-3xl p-6 flex flex-col gap-5">
          {!file ? (
            <UploadZone onFileSelect={handleFileSelect} error={!file ? error : ''} />
          ) : (
            <div className="relative group">
              <div
                className="rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative"
                style={{ background: 'rgba(0,0,0,0.2)' }}
              >
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
        </div>

        {/* ── Right: settings / loading / result ── */}
        <div className="glass rounded-3xl p-6">

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.3)' }}
              >
                <Loader2 size={30} className="text-accent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold mb-1">Удаляем фон…</p>
                <p className="text-xs text-muted max-w-[230px] leading-relaxed">
                  ИИ-модель анализирует изображение.<br />
                  При первом запуске загружается модель (~100 МБ) — это займёт 1–2 минуты.
                </p>
              </div>
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg,#6C5CE7,#00D2FF)',
                      animation: `pulse 1.4s ease-in-out ${i * 0.25}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Result state */}
          {!loading && result && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(0,210,100,0.15)', border: '1px solid rgba(0,210,100,0.3)' }}>
                  <CheckCircle2 size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Фон удалён!</p>
                  <p className="text-muted text-xs">PNG с прозрачностью готов к скачиванию</p>
                </div>
              </div>

              {/* File name */}
              <div className="flex items-center gap-2 mb-5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <ImageIcon size={14} className="text-muted shrink-0" />
                <span className="text-sm text-white truncate">{result.downloadName}</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full uppercase font-semibold shrink-0"
                  style={{ background: 'rgba(108,92,231,0.2)', color: '#6C5CE7' }}>
                  PNG
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
                  <p className="text-xs text-muted mb-1">Результат</p>
                  <p className="text-base font-bold text-accent">{formatBytes(result.resultSize)}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleDownload} className="btn-primary flex-1 justify-center py-3.5 rounded-2xl text-sm">
                  <Download size={17} />
                  Скачать PNG
                </button>
                <button onClick={handleReset} className="btn-secondary px-4 rounded-2xl" title="Обработать другой файл">
                  <RefreshCw size={17} />
                </button>
              </div>
            </div>
          )}

          {/* Settings / idle state */}
          {!loading && !result && (
            <div className="space-y-6">
              {/* Info banner */}
              <div className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)' }}>
                <Layers size={20} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Локальная ИИ-обработка</p>
                  <p className="text-xs text-muted leading-relaxed">
                    Фон удаляется прямо на сервере — без платных API и без передачи данных на сторонние сервисы.
                    При первом запуске модель (~100 МБ) загружается автоматически.
                  </p>
                </div>
              </div>

              {/* Format display */}
              <div>
                <p className="text-sm font-semibold text-white mb-3">Формат результата</p>
                <div className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.3)' }}>
                    <ImageIcon size={18} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">PNG с прозрачностью</p>
                    <p className="text-xs text-muted">Поддерживает альфа-канал</p>
                  </div>
                  <span className="ml-auto text-xs px-2 py-1 rounded-full font-semibold shrink-0"
                    style={{ background: 'rgba(108,92,231,0.2)', color: '#6C5CE7' }}>
                    Рекомендуется
                  </span>
                </div>
              </div>

              {/* Action button */}
              <button
                onClick={handleRemove}
                disabled={!file}
                className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-300 relative overflow-hidden"
                style={{
                  background: !file ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#6C5CE7,#5a4bd1)',
                  color: !file ? '#A7B0C0' : '#fff',
                  boxShadow: !file ? 'none' : '0 6px 30px rgba(108,92,231,0.4)',
                  cursor: !file ? 'not-allowed' : 'pointer',
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Eraser size={18} />
                  Удалить фон
                </span>
                {file && (
                  <span className="absolute inset-0 shimmer-bg opacity-0 hover:opacity-100 transition-opacity duration-300" />
                )}
              </button>

              {/* Error when file is selected but request failed */}
              {error && file && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm text-red-400"
                  style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}>
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Compare slider — full width, appears after successful removal ── */}
      {result && preview && (
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-semibold text-white">Сравнение До / После</span>
            <span className="text-xs text-muted ml-auto">Перетащи разделитель</span>
          </div>
          {/* Checkerboard on the container so transparency is visible in the "After" half */}
          <CompareSlider
            beforeSrc={preview}
            afterSrc={result.downloadUrl}
            containerStyle={CHECKERBOARD}
          />
        </div>
      )}
    </div>
  );
}
