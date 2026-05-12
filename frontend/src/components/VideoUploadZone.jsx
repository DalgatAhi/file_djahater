import { useRef, useState, useCallback } from 'react';
import { Film, Upload, AlertCircle } from 'lucide-react';

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_MB = 200;

export default function VideoUploadZone({ onFileSelect, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  const validate = useCallback((file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setLocalError('Неподдерживаемый формат. Принимаются MP4, MOV, WebM.');
      return false;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setLocalError(`Файл слишком большой. Максимум ${MAX_MB} МБ.`);
      return false;
    }
    setLocalError('');
    return true;
  }, []);

  const handleFile = useCallback((file) => {
    if (file && validate(file)) onFileSelect(file);
  }, [validate, onFileSelect]);

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const displayError = localError || error;

  return (
    <div className="w-full">
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`relative cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden
          ${dragging
            ? 'border-cyan-400/70 bg-cyan-400/10 scale-[1.01]'
            : displayError
            ? 'border-red-500/50 bg-red-500/5'
            : 'border-white/10 bg-white/[0.03] hover:border-cyan-400/40 hover:bg-white/[0.06]'
          }`}
        style={{ minHeight: '260px' }}
      >
        {dragging && (
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at center, rgba(0,210,255,0.12) 0%, transparent 70%)' }} />
        )}

        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${dragging ? 'scale-110' : ''}`}
            style={{
              background: dragging ? 'rgba(0,210,255,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${dragging ? 'rgba(0,210,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            {dragging
              ? <Upload size={36} style={{ color: '#00D2FF' }} className="animate-bounce" />
              : <Film size={36} className="text-muted" />
            }
          </div>

          <p className="text-lg font-semibold text-white mb-2">
            {dragging ? 'Отпусти видео здесь' : 'Перетащи видео сюда или выбери файл'}
          </p>
          <p className="text-sm text-muted mb-6">MP4, MOV, WebM до {MAX_MB} МБ</p>

          <div className="flex flex-wrap gap-2 justify-center">
            {['MP4', 'MOV', 'WebM'].map(fmt => (
              <span key={fmt} className="px-3 py-1 rounded-full text-xs font-medium text-muted"
                style={{ background: 'rgba(0,210,255,0.08)', border: '1px solid rgba(0,210,255,0.2)' }}>
                {fmt}
              </span>
            ))}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>

      {displayError && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-400 animate-fade-in">
          <AlertCircle size={15} />
          {displayError}
        </div>
      )}
    </div>
  );
}
