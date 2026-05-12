import { Download, CheckCircle2, TrendingDown, Film, RefreshCw } from 'lucide-react';

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

export default function VideoResult({ result, onReset }) {
  if (!result) return null;

  const { originalName, originalSize, compressedSize, savings, downloadUrl } = result;
  const isSmaller = compressedSize < originalSize;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `filelite_${originalName.replace(/\.[^.]+$/, '')}.mp4`;
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
          <p className="text-muted text-xs">Видео успешно сжато</p>
        </div>
      </div>

      {/* File name */}
      <div className="flex items-center gap-2 mb-5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <Film size={14} className="text-muted shrink-0" />
        <span className="text-sm text-white truncate">{originalName}</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full uppercase font-semibold shrink-0"
          style={{ background: 'rgba(0,210,255,0.15)', color: '#00D2FF' }}>
          MP4
        </span>
      </div>

      {/* Size comparison */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center p-4 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs text-muted mb-1">До</p>
          <p className="text-base font-bold text-white">{formatBytes(originalSize)}</p>
        </div>

        <div className="text-center p-4 rounded-2xl flex flex-col items-center justify-center"
          style={{
            background: isSmaller ? 'rgba(0,210,80,0.08)' : 'rgba(255,100,100,0.08)',
            border: `1px solid ${isSmaller ? 'rgba(0,210,80,0.25)' : 'rgba(255,100,100,0.25)'}`,
          }}>
          <TrendingDown size={16} className={isSmaller ? 'text-green-400' : 'text-red-400'} />
          <p className={`text-xl font-black mt-1 ${isSmaller ? 'text-green-400' : 'text-red-400'}`}>
            {isSmaller ? `-${savings}%` : `+${Math.abs(savings)}%`}
          </p>
        </div>

        <div className="text-center p-4 rounded-2xl"
          style={{ background: 'rgba(0,210,255,0.08)', border: '1px solid rgba(0,210,255,0.2)' }}>
          <p className="text-xs text-muted mb-1">После</p>
          <p className="text-base font-bold" style={{ color: '#00D2FF' }}>{formatBytes(compressedSize)}</p>
        </div>
      </div>

      {/* Visual bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-muted mb-1.5">
          <span>Исходный размер</span>
          <span>Сжатый размер</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min(100, (compressedSize / originalSize) * 100)}%`,
              background: isSmaller ? 'linear-gradient(90deg, #6C5CE7, #00D2FF)' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={handleDownload} className="btn-primary flex-1 justify-center py-3.5 rounded-2xl text-sm">
          <Download size={17} />
          Скачать MP4
        </button>
        <button onClick={onReset} className="btn-secondary px-4 rounded-2xl" title="Сжать другое видео">
          <RefreshCw size={17} />
        </button>
      </div>
    </div>
  );
}
