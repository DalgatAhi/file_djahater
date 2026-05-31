import { Download, CheckCircle2, Music, RefreshCw, FileAudio } from 'lucide-react';

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

function buildAudioName(originalName, format) {
  const nameWithoutExt = originalName.replace(/\.[^.]+$/, '');
  const safe = nameWithoutExt.replace(/\s+/g, '_').replace(/[<>:"/\\|?*\x00-\x1F]/g, '');
  return `${safe}_audio.${format.toLowerCase()}`;
}

const FORMAT_COLORS = {
  MP3: '#00D2FF',
  M4A: '#6C5CE7',
  WAV: '#f39c12',
  OGG: '#00b894',
};

const QUALITY_LABELS = {
  low: 'Экономия',
  medium: 'Баланс',
  high: 'Высокое',
};

export default function AudioExtractorResult({ result, onReset }) {
  if (!result) return null;

  const { originalName, originalSize, audioSize, downloadUrl, format, quality } = result;
  const color = FORMAT_COLORS[format] || '#00D2FF';
  const reduction = Math.round(((originalSize - audioSize) / originalSize) * 100);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = buildAudioName(originalName, format);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      const filename = downloadUrl.split('/').pop();
      fetch(`/api/file/${filename}`, { method: 'DELETE' }).catch(() => {});
    }, 2000);
  };

  return (
    <div className="animate-fade-up" style={{ opacity: 0 }}>
      {/* Success header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(0,210,100,0.15)', border: '1px solid rgba(0,210,100,0.3)' }}>
          <CheckCircle2 size={20} className="text-green-400" />
        </div>
        <div>
          <p className="text-white font-semibold">Готово!</p>
          <p className="text-muted text-xs">Аудио успешно извлечено из видео</p>
        </div>
      </div>

      {/* Source file */}
      <div className="flex items-center gap-2 mb-5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <FileAudio size={14} className="text-muted shrink-0" />
        <span className="text-sm text-white truncate">{originalName}</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
          style={{ background: `${color}22`, color }}>
          {format}
        </span>
      </div>

      {/* Size stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-4 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs text-muted mb-1">Видео (исходник)</p>
          <p className="text-base font-bold text-white">{formatBytes(originalSize)}</p>
        </div>
        <div className="text-center p-4 rounded-2xl"
          style={{ background: `${color}14`, border: `1px solid ${color}33` }}>
          <p className="text-xs text-muted mb-1">Аудио файл</p>
          <p className="text-base font-bold" style={{ color }}>{formatBytes(audioSize)}</p>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Music size={13} className="text-muted shrink-0" />
        <span className="text-xs text-muted">Формат:</span>
        <span className="text-xs font-semibold" style={{ color }}>{format}</span>
        {quality && format !== 'WAV' && (
          <>
            <span className="text-white/20">·</span>
            <span className="text-xs text-muted">Качество:</span>
            <span className="text-xs font-semibold text-white">{QUALITY_LABELS[quality] || quality}</span>
          </>
        )}
        {reduction > 0 && (
          <span className="ml-auto text-xs text-muted shrink-0">−{reduction}% от исходника</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}bb)`,
            boxShadow: `0 6px 20px ${color}33`,
            color: '#fff',
          }}
        >
          <Download size={17} />
          Скачать {format}
        </button>
        <button onClick={onReset} className="btn-secondary px-4 rounded-2xl" title="Извлечь из другого видео">
          <RefreshCw size={17} />
        </button>
      </div>
    </div>
  );
}
