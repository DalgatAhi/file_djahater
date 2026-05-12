import { Upload, Cpu } from 'lucide-react';

export default function VideoProgressBar({ status, progress }) {
  const isUploading = status === 'uploading';

  return (
    <div className="mt-5 animate-fade-in">
      {/* Status badge */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: isUploading ? 'rgba(0,210,255,0.12)' : 'rgba(108,92,231,0.12)', border: `1px solid ${isUploading ? 'rgba(0,210,255,0.3)' : 'rgba(108,92,231,0.3)'}` }}>
          {isUploading
            ? <Upload size={13} style={{ color: '#00D2FF' }} />
            : <Cpu size={13} style={{ color: '#6C5CE7' }} className="animate-pulse" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white">
            {isUploading ? 'Загружаем файл на сервер...' : 'Сжимаем видео...'}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {isUploading
              ? 'Скорость зависит от размера файла'
              : 'Это может занять от нескольких секунд до пары минут'
            }
          </p>
        </div>
        <span className="text-sm font-bold shrink-0" style={{ color: isUploading ? '#00D2FF' : '#6C5CE7' }}>
          {progress}%
        </span>
      </div>

      {/* Progress track */}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        {isUploading && progress === 0 ? (
          // Indeterminate shimmer while starting
          <div className="h-full rounded-full progress-bar" style={{ width: '100%', opacity: 0.5 }} />
        ) : (
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: isUploading
                ? 'linear-gradient(90deg, #00D2FF, #6C5CE7)'
                : 'linear-gradient(90deg, #6C5CE7, #00D2FF, #6C5CE7)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s linear infinite',
            }}
          />
        )}
      </div>

      {/* Step indicators */}
      <div className="flex justify-between mt-3">
        {['Загрузка', 'Сжатие', 'Готово'].map((step, i) => {
          const done = (i === 0 && !isUploading) || (i === 2 && progress === 100);
          const active = (i === 0 && isUploading) || (i === 1 && !isUploading && progress < 100);
          return (
            <div key={step} className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                done ? 'bg-green-400' : active ? 'bg-accent' : 'bg-white/20'
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
