import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ITEMS = [
  {
    q: 'Теряется ли качество при сжатии?',
    a: 'Это зависит от выбранного режима. В режиме «Высокое качество» разницу с оригиналом практически невозможно заметить невооружённым глазом. В режиме «Максимальное сжатие» возможна лёгкая потеря чёткости, зато размер уменьшается до 90%.',
  },
  {
    q: 'Какие форматы поддерживаются?',
    a: 'Изображения: JPG, JPEG, PNG, WebP (до 25 МБ) — на выход WebP, JPEG или PNG. Видео: MP4, MOV, WebM (до 200 МБ) — на выход оптимизированный MP4 (H.264/AAC) с максимальной совместимостью.',
  },
  {
    q: 'Можно ли сжимать видео?',
    a: 'Да! Переключи вкладку на «Видео» в блоке загрузки. FileLite использует FFmpeg для сжатия MP4, MOV и WebM. Выбери режим — и получи готовый MP4 с меньшим размером. Прогресс обработки отображается в реальном времени.',
  },
  {
    q: 'Хранятся ли мои файлы на сервере?',
    a: 'Нет. Файлы удаляются сразу после скачивания. Даже если ты не скачаешь результат, временные файлы автоматически очищаются каждые 30 минут.',
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`glass rounded-2xl transition-all duration-300 overflow-hidden cursor-pointer
        ${open ? 'border border-accent/30' : 'border border-white/5 hover:border-white/15'}`}
      onClick={() => setOpen(v => !v)}
    >
      <div className="flex items-center justify-between px-6 py-5">
        <span className="text-sm font-semibold text-white pr-4">{q}</span>
        <ChevronDown
          size={18}
          className={`text-muted shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-accent' : ''}`}
        />
      </div>

      {open && (
        <div className="px-6 pb-5 animate-fade-in">
          <p className="text-sm text-muted leading-relaxed border-t border-white/5 pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="section-label mb-4 inline-flex">FAQ</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Частые вопросы</h2>
        </div>

        <div className="space-y-3">
          {ITEMS.map(item => <FAQItem key={item.q} {...item} />)}
        </div>
      </div>
    </section>
  );
}
