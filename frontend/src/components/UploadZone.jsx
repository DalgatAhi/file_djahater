import { useRef, useState, useCallback } from 'react';
import { Upload, Image, AlertCircle } from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_MB = 25;

export default function UploadZone({ onFileSelect, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  const validate = useCallback((file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setLocalError('Неподдерживаемый формат. Принимаются JPG, PNG, WebP.');
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
    if (file && validate(file)) {
      onFileSelect(file);
    }
  }, [validate, onFileSelect]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

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
            ? 'border-accent bg-accent/10 scale-[1.01]'
            : displayError
            ? 'border-red-500/50 bg-red-500/5'
            : 'border-white/10 bg-white/[0.03] hover:border-accent/50 hover:bg-white/[0.06]'
          }`}
        style={{ minHeight: '260px' }}
      >
        {/* Inner glow when dragging */}
        {dragging && (
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at center, rgba(108,92,231,0.15) 0%, transparent 70%)' }} />
        )}

        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          {/* Icon */}
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300
            ${dragging ? 'scale-110' : ''}
          `}
            style={{ background: dragging ? 'rgba(108,92,231,0.3)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {dragging ? (
              <Upload size={36} className="text-accent animate-bounce" />
            ) : (
              <Image size={36} className="text-muted" />
            )}
          </div>

          {/* Text */}
          <p className="text-lg font-semibold text-white mb-2">
            {dragging ? 'Отпусти файл здесь' : 'Перетащи изображение сюда или выбери файл'}
          </p>
          <p className="text-sm text-muted mb-6">JPG, PNG, WebP до {MAX_MB} МБ</p>

          {/* File formats badge row */}
          <div className="flex flex-wrap gap-2 justify-center">
            {['JPG', 'JPEG', 'PNG', 'WebP'].map(fmt => (
              <span key={fmt} className="px-3 py-1 rounded-full text-xs font-medium text-muted"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {fmt}
              </span>
            ))}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>

      {/* Error message */}
      {displayError && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-400 animate-fade-in">
          <AlertCircle size={15} />
          {displayError}
        </div>
      )}
    </div>
  );
}
