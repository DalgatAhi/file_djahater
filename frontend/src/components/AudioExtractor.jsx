import { useState, useRef, useCallback, useEffect } from 'react';
import VideoUploadZone from './VideoUploadZone';
import AudioExtractorSettings from './AudioExtractorSettings';
import VideoProgressBar from './VideoProgressBar';
import AudioExtractorResult from './AudioExtractorResult';
import { X, Film } from 'lucide-react';

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

export default function AudioExtractor() {
  const [file, setFile]         = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [format, setFormat]     = useState('mp3');
  const [quality, setQuality]   = useState('medium');
  // status: idle | uploading | processing | done | error
  const [status, setStatus]     = useState('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

  const videoSrcRef = useRef(null);
  const xhrRef      = useRef(null);
  const esRef       = useRef(null);

  useEffect(() => {
    return () => {
      if (xhrRef.current) xhrRef.current.abort();
      if (esRef.current)  esRef.current.close();
      if (videoSrcRef.current) URL.revokeObjectURL(videoSrcRef.current);
    };
  }, []);

  const handleFileSelect = useCallback((f) => {
    if (videoSrcRef.current) URL.revokeObjectURL(videoSrcRef.current);
    const url = URL.createObjectURL(f);
    videoSrcRef.current = url;
    setFile(f);
    setVideoSrc(url);
    setResult(null);
    setError('');
    setStatus('idle');
    setProgress(0);
  }, []);

  const handleReset = () => {
    if (xhrRef.current) { xhrRef.current.abort(); xhrRef.current = null; }
    if (esRef.current)  { esRef.current.close();  esRef.current  = null; }
    if (videoSrcRef.current) { URL.revokeObjectURL(videoSrcRef.current); videoSrcRef.current = null; }
    setFile(null);
    setVideoSrc(null);
    setResult(null);
    setError('');
    setStatus('idle');
    setProgress(0);
  };

  const openSSE = (jobId) => {
    const es = new EventSource(`/api/extract-audio/progress/${jobId}`);
    esRef.current = es;

    es.onmessage = (event) => {
      const d = JSON.parse(event.data);
      setProgress(d.progress ?? 0);

      if (d.status === 'done') {
        setResult(d.result);
        setStatus('done');
        es.close();
        esRef.current = null;
      } else if (d.status === 'error') {
        setError(d.error || 'Ошибка извлечения аудио');
        setStatus('error');
        es.close();
        esRef.current = null;
      }
    };

    es.onerror = () => {
      setError('Соединение с сервером прервано. Попробуйте ещё раз.');
      setStatus('error');
      es.close();
      esRef.current = null;
    };
  };

  const handleExtract = () => {
    if (!file) return;
    setStatus('uploading');
    setProgress(0);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    formData.append('quality', quality);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        setStatus('processing');
        setProgress(0);
        openSSE(data.jobId);
      } else {
        const data = JSON.parse(xhr.responseText);
        const msgs = {
          FILE_TOO_LARGE:     'Файл превышает 200 МБ.',
          UNSUPPORTED_FORMAT: 'Неподдерживаемый формат. Принимаются MP4, MOV, WebM.',
          SERVER_ERROR:       'Ошибка сервера. Попробуйте ещё раз.',
        };
        setError(msgs[data.error] || data.message || 'Ошибка загрузки');
        setStatus('error');
      }
    };

    xhr.onerror = () => {
      xhrRef.current = null;
      setError('Не удалось связаться с сервером.');
      setStatus('error');
    };

    xhr.open('POST', '/api/extract-audio');
    xhr.send(formData);
  };

  const isProcessing = status === 'uploading' || status === 'processing';

  // Custom progress labels for audio extraction
  const progressLabel = status === 'uploading'
    ? 'Загружаем видео на сервер...'
    : 'Извлекаем аудиодорожку...';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Upload / Preview */}
      <div className="glass rounded-3xl p-6 flex flex-col gap-5">
        {!file ? (
          <VideoUploadZone
            onFileSelect={handleFileSelect}
            error={status === 'error' && !file ? error : ''}
          />
        ) : (
          <div className="relative group">
            <div className="rounded-2xl overflow-hidden bg-black/30 aspect-video flex items-center justify-center relative">
              <video
                src={videoSrc}
                className="max-h-60 max-w-full rounded-xl"
                controls
                preload="metadata"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-2xl">
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
                <Film size={14} className="text-muted shrink-0" />
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

      {/* Right: Settings / Progress / Result */}
      <div className="glass rounded-3xl p-6">
        {status === 'done' ? (
          <AudioExtractorResult result={result} onReset={handleReset} />
        ) : (
          <>
            <AudioExtractorSettings
              format={format}
              setFormat={setFormat}
              quality={quality}
              setQuality={setQuality}
              onExtract={handleExtract}
              file={file}
              loading={isProcessing}
            />

            {isProcessing && (
              <AudioProgressBar status={status} progress={progress} />
            )}

            {status === 'error' && (
              <div
                className="mt-4 p-3 rounded-xl text-sm text-red-400 animate-fade-in"
                style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}
              >
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Inline progress bar customised for audio extraction
function AudioProgressBar({ status, progress }) {
  const isUploading = status === 'uploading';

  return (
    <div className="mt-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: isUploading ? 'rgba(0,210,255,0.12)' : 'rgba(0,184,148,0.12)',
            border: `1px solid ${isUploading ? 'rgba(0,210,255,0.3)' : 'rgba(0,184,148,0.3)'}`,
          }}
        >
          {isUploading
            ? <span style={{ fontSize: 13, color: '#00D2FF' }}>↑</span>
            : <span style={{ fontSize: 13, color: '#00b894' }} className="animate-pulse">♪</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white">
            {isUploading ? 'Загружаем видео на сервер...' : 'Извлекаем аудиодорожку...'}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {isUploading
              ? 'Скорость зависит от размера файла'
              : 'FFmpeg обрабатывает аудиопоток — займёт несколько секунд'
            }
          </p>
        </div>
        <span
          className="text-sm font-bold shrink-0"
          style={{ color: isUploading ? '#00D2FF' : '#00b894' }}
        >
          {progress}%
        </span>
      </div>

      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        {isUploading && progress === 0 ? (
          <div className="h-full rounded-full progress-bar" style={{ width: '100%', opacity: 0.5 }} />
        ) : (
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: isUploading
                ? 'linear-gradient(90deg, #00D2FF, #00b894)'
                : 'linear-gradient(90deg, #00b894, #00D2FF, #00b894)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s linear infinite',
            }}
          />
        )}
      </div>

      <div className="flex justify-between mt-3">
        {['Загрузка', 'Извлечение', 'Готово'].map((step, i) => {
          const done   = (i === 0 && !isUploading) || (i === 2 && progress === 100);
          const active = (i === 0 && isUploading)  || (i === 1 && !isUploading && progress < 100);
          return (
            <div key={step} className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                done ? 'bg-green-400' : active ? 'bg-cyan-400' : 'bg-white/20'
              }`} />
              <span className={`text-[10px] transition-colors duration-300 ${
                done ? 'text-green-400' : active ? 'text-white' : 'text-muted/40'
              }`}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
