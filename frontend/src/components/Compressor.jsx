import { useState, useRef } from 'react';
import UploadZone from './UploadZone';
import Settings from './Settings';
import Result from './Result';
import ProgressBar from './ProgressBar';
import { X, ImageIcon } from 'lucide-react';

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

export default function Compressor() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState('balanced');
  const [format, setFormat] = useState('webp');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const previewUrl = useRef(null);

  const handleFileSelect = (f) => {
    // Revoke previous preview URL to avoid memory leaks
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);

    setFile(f);
    setResult(null);
    setError('');
    const url = URL.createObjectURL(f);
    previewUrl.current = url;
    setPreview(url);
  };

  const handleReset = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
  };

  const handleCompress = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      formData.append('format', format);

      const res = await fetch('/api/compress', { method: 'POST', body: formData });
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

  return (
    <section id="upload" className="py-12 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <span className="section-label mb-4 inline-flex">Загрузка</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Начни прямо сейчас</h2>
          <p className="text-muted mt-3 max-w-sm mx-auto text-sm">
            Без регистрации, без лимитов на количество файлов.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upload + Preview */}
          <div className="glass rounded-3xl p-6 flex flex-col gap-5">
            {!file ? (
              <UploadZone onFileSelect={handleFileSelect} error={error} />
            ) : (
              <div className="relative group">
                {/* Preview image */}
                <div className="rounded-2xl overflow-hidden bg-black/20 aspect-video flex items-center justify-center relative">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Предпросмотр"
                      className="max-h-60 max-w-full object-contain"
                    />
                  ) : (
                    <ImageIcon size={48} className="text-muted" />
                  )}

                  {/* Overlay on hover */}
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

                {/* File info */}
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

            {/* Error in upload panel */}
            {error && !file && (
              <div className="p-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}>
                {error}
              </div>
            )}
          </div>

          {/* Right: Settings or Result */}
          <div className="glass rounded-3xl p-6">
            {result ? (
              <Result
                result={result}
                onReset={handleReset}
                onDownloaded={() => {}}
              />
            ) : (
              <>
                <Settings
                  mode={mode}
                  setMode={setMode}
                  format={format}
                  setFormat={setFormat}
                  onCompress={handleCompress}
                  file={file}
                  loading={loading}
                />

                {loading && <ProgressBar active={loading} />}

                {error && file && (
                  <div className="mt-4 p-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}>
                    {error}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
