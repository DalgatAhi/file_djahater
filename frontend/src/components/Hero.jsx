import { ArrowDown, Play, Sparkles } from 'lucide-react';

export default function Hero({ onStart }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background blobs */}
      <div
        className="glow-blob w-[600px] h-[600px] top-[-100px] left-[-200px]"
        style={{ background: '#6C5CE7' }}
      />
      <div
        className="glow-blob w-[400px] h-[400px] bottom-[100px] right-[-100px]"
        style={{ background: '#00D2FF' }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-8 animate-fade-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <span className="section-label">
            <Sparkles size={12} />
            Изображения и видео — в одном месте
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6 animate-fade-up"
          style={{ animationDelay: '0.2s', opacity: 0 }}
        >
          Сжимай файлы быстро,{' '}
          <span className="gradient-text">красиво и без</span>
          <br />
          потери контроля
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-up"
          style={{ animationDelay: '0.35s', opacity: 0 }}
        >
          FileLite помогает уменьшить размер изображений и видео за несколько секунд,
          сохраняя качество и удобство скачивания.
        </p>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up"
          style={{ animationDelay: '0.5s', opacity: 0 }}
        >
          <button onClick={onStart} className="btn-primary text-base px-8 py-4 rounded-2xl">
            <Sparkles size={18} />
            Сжать файл
          </button>
          <a href="#how" className="btn-secondary text-base px-8 py-4 rounded-2xl">
            <Play size={16} fill="currentColor" />
            Как это работает
          </a>
        </div>

        {/* Stats bar */}
        <div
          className="glass rounded-2xl px-4 sm:px-8 py-4 sm:py-5 inline-flex flex-wrap justify-center gap-5 sm:gap-10 animate-fade-up w-full sm:w-auto"
          style={{ animationDelay: '0.65s', opacity: 0 }}
        >
          {[
            { value: '90%',    label: 'Экономия места'      },
            { value: '< 3с',   label: 'Фото обрабатывается' },
            { value: '200 МБ', label: 'Макс. размер видео'  },
            { value: '6',      label: 'Форматов файлов'     },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold gradient-text-accent">{stat.value}</div>
              <div className="text-xs text-muted mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 flex justify-center animate-float">
          <a href="#upload" className="text-muted/50 hover:text-muted transition-colors">
            <ArrowDown size={22} />
          </a>
        </div>
      </div>
    </section>
  );
}
