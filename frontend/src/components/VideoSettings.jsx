import { Zap, Scale, Star, Loader2 } from 'lucide-react';

const MODES = [
  {
    id: 'max',
    label: 'Максимальное',
    description: '720p · меньший размер',
    icon: Zap,
    color: '#00D2FF',
  },
  {
    id: 'balanced',
    label: 'Баланс',
    description: '1080p · оптимально',
    icon: Scale,
    color: '#6C5CE7',
  },
  {
    id: 'high',
    label: 'Высокое качество',
    description: 'оригинал · минимум потерь',
    icon: Star,
    color: '#f39c12',
  },
];

export default function VideoSettings({ mode, setMode, onCompress, file, loading }) {
  return (
    <div className="space-y-6">
      {/* Mode selection */}
      <div>
        <p className="text-sm font-semibold text-white mb-3">Режим сжатия</p>
        <div className="grid grid-cols-3 gap-3">
          {MODES.map(m => {
            const Icon = m.icon;
            const selected = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`mode-card flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 text-center
                  ${selected
                    ? 'selected'
                    : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20'
                  }`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: selected ? `${m.color}22` : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${selected ? m.color + '55' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  <Icon size={16} style={{ color: selected ? m.color : '#A7B0C0' }} />
                </div>
                <div>
                  <p className={`text-xs font-semibold leading-tight ${selected ? 'text-white' : 'text-muted'}`}>
                    {m.label}
                  </p>
                  <p className="text-[10px] text-muted/70 mt-0.5 hidden sm:block">{m.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Output format info */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(0,210,255,0.06)', border: '1px solid rgba(0,210,255,0.15)' }}>
        <span className="text-xs text-muted">Формат результата:</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(0,210,255,0.15)', color: '#00D2FF' }}>
          MP4 (H.264)
        </span>
        <span className="text-xs text-muted ml-auto">максимальная совместимость</span>
      </div>

      {/* Compress button */}
      <button
        onClick={onCompress}
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
            Обрабатываем...
          </span>
        ) : (
          'Сжать видео'
        )}
        {file && !loading && (
          <span className="absolute inset-0 shimmer-bg opacity-0 hover:opacity-100 transition-opacity duration-300" />
        )}
      </button>
    </div>
  );
}
