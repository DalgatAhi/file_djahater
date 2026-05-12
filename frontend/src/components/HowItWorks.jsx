import { Upload, SlidersHorizontal, Download } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    icon: Upload,
    title: 'Загрузи файл',
    description: 'Перетащи изображение в зону загрузки или выбери его вручную. Поддерживаются JPG, PNG и WebP до 25 МБ.',
    color: '#6C5CE7',
  },
  {
    step: '02',
    icon: SlidersHorizontal,
    title: 'Выбери качество',
    description: 'Настрой режим сжатия и формат результата под свои задачи — от максимального сжатия до высокого качества.',
    color: '#00D2FF',
  },
  {
    step: '03',
    icon: Download,
    title: 'Скачай результат',
    description: 'Получи оптимизированный файл мгновенно. Сервер автоматически удалит временные данные после скачивания.',
    color: '#a29bfe',
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 relative">
      {/* Connector line (desktop only) */}
      <div className="hidden lg:block absolute top-[50%] left-[16%] right-[16%] h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(108,92,231,0.3), transparent)' }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="section-label mb-4 inline-flex">Как работает</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Три простых шага</h2>
          <p className="text-muted mt-3 max-w-md mx-auto">Никаких регистраций и лишних действий — только результат.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="glass-hover rounded-3xl p-8 relative group">
                {/* Step number */}
                <div className="text-6xl font-black mb-6 leading-none select-none"
                  style={{
                    background: `linear-gradient(135deg, ${s.color}22, transparent)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                  {s.step}
                </div>

                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${s.color}18`, border: `1px solid ${s.color}33` }}>
                  <Icon size={22} style={{ color: s.color }} />
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{s.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
