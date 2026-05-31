import { Music, FileAudio, Waves, Disc3, Loader2 } from 'lucide-react';

const FORMATS = [
  { id: 'mp3', label: 'MP3', description: 'Универсальный · все устройства', Icon: Music,     color: '#00D2FF' },
  { id: 'm4a', label: 'M4A', description: 'Apple · высокое качество',       Icon: FileAudio, color: '#6C5CE7' },
  { id: 'wav', label: 'WAV', description: 'Без потерь · студийный',          Icon: Waves,     color: '#f39c12' },
  { id: 'ogg', label: 'OGG', description: 'Открытый · веб-стандарт',        Icon: Disc3,     color: '#00b894' },
];

const QUALITIES = [
  { id: 'low',    label: 'Экономия', hint: '~96 кбит/с'  },
  { id: 'medium', label: 'Баланс',   hint: '~192 кбит/с' },
  { id: 'high',   label: 'Высокое',  hint: '320 кбит/с'  },
];

export default function AudioExtractorSettings({ format, setFormat, quality, setQuality, onExtract, file, loading }) {
  const isWav = format === 'wav';
  const selected = FORMATS.find(f => f.id === format);

  return (
    <div className="space-y-5">
      {/* Format grid */}
      <div>
        <p className="text-sm font-semibold text-white mb-3">Формат аудио</p>
        <div className="grid grid-cols-2 gap-2.5">
          {FORMATS.map(({ id, label, description, Icon, color }) => {
            const active = format === id;
            return (
              <button
                key={id}
                onClick={() => setFormat(id)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 text-left
                  ${active ? 'selected mode-card' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20'}`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: active ? `${color}22` : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${active ? color + '55' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  <Icon size={16} style={{ color: active ? color : '#A7B0C0' }} />
                </div>
                <div>
                  <p className={`text-xs font-bold leading-tight ${active ? 'text-white' : 'text-muted'}`}>{label}</p>
                  <p className="text-[10px] text-muted/70 mt-0.5">{description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quality selector — hidden for WAV (lossless) */}
      {!isWav ? (
        <div>
          <p className="text-sm font-semibold text-white mb-3">Качество</p>
          <div className="grid grid-cols-3 gap-2">
            {QUALITIES.map(({ id, label, hint }) => {
              const active = quality === id;
              return (
                <button
                  key={id}
                  onClick={() => setQuality(id)}
                  className={`flex flex-col items-center py-3 px-2 rounded-xl border text-center transition-all duration-200
                    ${active
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20'
                    }`}
                >
                  <p className={`text-xs font-semibold ${active ? 'text-white' : 'text-muted'}`}>{label}</p>
                  <p className="text-[10px] text-muted/60 mt-0.5">{hint}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(243,156,18,0.06)', border: '1px solid rgba(243,156,18,0.2)' }}>
          <Waves size={14} style={{ color: '#f39c12', marginTop: 1 }} className="shrink-0" />
          <p className="text-xs text-muted leading-relaxed">
            WAV — формат без потерь. Файл будет крупнее, зато качество студийное.
          </p>
        </div>
      )}

      {/* Output format badge */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(0,210,255,0.06)', border: '1px solid rgba(0,210,255,0.15)' }}>
        <span className="text-xs text-muted">Результат:</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full ml-auto"
          style={{ background: `${selected?.color ?? '#00D2FF'}22`, color: selected?.color ?? '#00D2FF' }}
        >
          .{format.toUpperCase()}
        </span>
      </div>

      {/* Action button */}
      <button
        onClick={onExtract}
        disabled={!file || loading}
        className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-300 relative overflow-hidden"
        style={{
          background: (!file || loading)
            ? 'rgba(255,255,255,0.06)'
            : 'linear-gradient(135deg, #00D2FF, #0099cc)',
          color: (!file || loading) ? '#A7B0C0' : '#fff',
          boxShadow: (!file || loading) ? 'none' : '0 6px 30px rgba(0,210,255,0.3)',
          cursor: (!file || loading) ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Извлекаем аудио...
          </span>
        ) : 'Извлечь аудио'}
        {file && !loading && (
          <span className="absolute inset-0 shimmer-bg opacity-0 hover:opacity-100 transition-opacity duration-300" />
        )}
      </button>
    </div>
  );
}
