import { Zap, UserX, FileType2, SlidersHorizontal } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'Быстро',
    description: 'Сжатие происходит на сервере за секунды с помощью библиотеки Sharp — одной из быстрейших для обработки изображений.',
    color: '#00D2FF',
  },
  {
    icon: UserX,
    title: 'Без регистрации',
    description: 'Просто загрузи файл и скачай результат. Никаких аккаунтов, email-подтверждений и лишних шагов.',
    color: '#6C5CE7',
  },
  {
    icon: FileType2,
    title: 'Современные форматы',
    description: 'Конвертация в WebP — формат нового поколения, который браузеры поддерживают нативно и который весит в разы меньше.',
    color: '#a29bfe',
  },
  {
    icon: SlidersHorizontal,
    title: 'Контроль качества',
    description: 'Три режима сжатия позволяют самому решить, что важнее — минимальный размер или максимальное качество изображения.',
    color: '#fd79a8',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="section-label mb-4 inline-flex">Преимущества</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Почему FileLite</h2>
          <p className="text-muted mt-3 max-w-md mx-auto">
            Инструмент, который уважает твоё время и приватность.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="glass-hover rounded-3xl p-7 flex gap-5 group"
              >
                <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}33` }}>
                  <Icon size={22} style={{ color: f.color }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{f.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
