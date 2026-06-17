import { useState, useRef } from 'react';
import TypeSwitcher from './TypeSwitcher';
import UploadZone from './UploadZone';
import Settings from './Settings';
import Result from './Result';
import ProgressBar from './ProgressBar';
import VideoCompressor from './VideoCompressor';
import AudioExtractor from './AudioExtractor';
import Upscaler from './Upscaler';
import BackgroundRemover from './BackgroundRemover';
import VideoDownloader from './VideoDownloader';
import { X, ImageIcon, Minimize2, Wand2, Eraser, Film, Music, Download } from 'lucide-react';

const VIDEO_TABS = [
  { id: 'compress', label: 'Сжать видео',   Icon: Film  },
  { id: 'audio',    label: 'Извлечь аудио', Icon: Music },
];

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

// Top-level section tabs
const SECTIONS = [
  { id: 'compress',  label: 'Сжатие',           Icon: Minimize2 },
  { id: 'upscale',   label: 'Улучшение фото',   Icon: Wand2     },
  { id: 'removebg',  label: 'Удаление фона',    Icon: Eraser    },
  { id: 'download',  label: 'Скачать видео',    Icon: Download  },
];

export default function Compressor() {
  const [section, setSection] = useState('compress');
  const [fileType, setFileType] = useState('image');
  const [videoTab, setVideoTab] = useState('compress');

  // Image compressor state
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode]       = useState('balanced');
  const [format, setFormat]   = useState('webp');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');
  const previewUrl            = useRef(null);

  const handleSectionChange = (s) => {
    // Reset image state when switching sections
    if (previewUrl.current) { URL.revokeObjectURL(previewUrl.current); previewUrl.current = null; }
    setFile(null); setPreview(null); setResult(null); setError(''); setLoading(false);
    setSection(s);
  };

  const handleTypeChange = (t) => {
    if (previewUrl.current) { URL.revokeObjectURL(previewUrl.current); previewUrl.current = null; }
    setFile(null); setPreview(null); setResult(null); setError(''); setLoading(false);
    setFileType(t);
    setVideoTab('compress');
  };

  const handleFileSelect = (f) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    setFile(f);
    setResult(null);
    setError('');
    const url = URL.createObjectURL(f);
    previewUrl.current = url;
    setPreview(url);
  };

  const handleReset = () => {
    if (previewUrl.current) { URL.revokeObjectURL(previewUrl.current); previewUrl.current = null; }
    setFile(null); setPreview(null); setResult(null); setError('');
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
          FILE_TOO_LARGE:     'Файл превышает 25 МБ.',
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

  return (
    <section id="upload" className="py-12 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-8">
          <span className="section-label mb-4 inline-flex">Инструменты</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Начни прямо сейчас</h2>
          <p className="text-muted mt-3 max-w-sm mx-auto text-sm">
            Без регистрации, без лимитов на количество файлов.
          </p>
        </div>

        {/* Outer section switcher: Сжатие / Улучшение фото */}
        <div className="flex justify-center mb-6">
          <div
            className="inline-flex items-center p-1 rounded-2xl gap-1"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {SECTIONS.map(({ id, label, Icon }) => {
              const active = section === id;
              return (
                <button
                  key={id}
                  onClick={() => handleSectionChange(id)}
                  className={`flex items-center gap-2 py-2.5 px-6 rounded-xl text-sm font-semibold transition-all duration-250
                    ${active ? 'text-white' : 'text-muted hover:text-white'}`}
                  style={
                    active
                      ? {
                          background: 'linear-gradient(135deg, #6C5CE7, #5a4bd1)',
                          boxShadow: '0 4px 20px rgba(108,92,231,0.4)',
                        }
                      : {}
                  }
                >
                  <Icon size={15} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SECTION: Сжатие ── */}
        {section === 'compress' && (
          <>
            {/* Image / Video sub-switcher */}
            <div className="flex justify-center mb-8">
              <TypeSwitcher type={fileType} setType={handleTypeChange} />
            </div>

            {/* Image compressor */}
            {fileType === 'image' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Upload + Preview */}
                <div className="glass rounded-3xl p-6 flex flex-col gap-5">
                  {!file ? (
                    <UploadZone onFileSelect={handleFileSelect} error={error} />
                  ) : (
                    <div className="relative group">
                      <div className="rounded-2xl overflow-hidden bg-black/20 aspect-video flex items-center justify-center relative">
                        {preview ? (
                          <img src={preview} alt="Предпросмотр" className="max-h-60 max-w-full object-contain" />
                        ) : (
                          <ImageIcon size={48} className="text-muted" />
                        )}
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

                {/* Right: Settings or Result */}
                <div className="glass rounded-3xl p-6">
                  {result ? (
                    <Result result={result} onReset={handleReset} onDownloaded={() => {}} />
                  ) : (
                    <>
                      <Settings
                        mode={mode} setMode={setMode}
                        format={format} setFormat={setFormat}
                        onCompress={handleCompress}
                        file={file} loading={loading}
                      />
                      {loading && <ProgressBar active={loading} />}
                      {error && file && (
                        <div className="mt-4 p-3 rounded-xl text-sm text-red-400"
                          style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}>
                          {error}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Video section with sub-tabs */}
            {fileType === 'video' && (
              <>
                {/* Video sub-tab switcher */}
                <div className="flex justify-center mb-6">
                  <div
                    className="inline-flex items-center p-1 rounded-2xl gap-1"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {VIDEO_TABS.map(({ id, label, Icon }) => {
                      const active = videoTab === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setVideoTab(id)}
                          className={`flex items-center gap-2 py-2 px-5 rounded-xl text-sm font-semibold transition-all duration-250
                            ${active ? 'text-white' : 'text-muted hover:text-white'}`}
                          style={
                            active
                              ? {
                                  background: id === 'audio'
                                    ? 'linear-gradient(135deg, #00D2FF, #0099cc)'
                                    : 'linear-gradient(135deg, #6C5CE7, #5a4bd1)',
                                  boxShadow: id === 'audio'
                                    ? '0 4px 20px rgba(0,210,255,0.3)'
                                    : '0 4px 20px rgba(108,92,231,0.4)',
                                }
                              : {}
                          }
                        >
                          <Icon size={14} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {videoTab === 'compress' && <VideoCompressor />}
                {videoTab === 'audio'    && <AudioExtractor />}
              </>
            )}
          </>
        )}

        {/* ── SECTION: Улучшение фото ── */}
        {section === 'upscale' && <Upscaler />}

        {/* ── SECTION: Удаление фона ── */}
        {section === 'removebg' && <BackgroundRemover />}

        {/* ── SECTION: Скачать видео ── */}
        {section === 'download' && <VideoDownloader />}
      </div>
    </section>
  );
}
