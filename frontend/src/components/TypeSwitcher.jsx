import { Image, Film } from 'lucide-react';

const TABS = [
  { id: 'image', label: 'Изображение', Icon: Image },
  { id: 'video', label: 'Видео',       Icon: Film  },
];

export default function TypeSwitcher({ type, setType }) {
  return (
    <div
      className="inline-flex items-center p-1 rounded-2xl gap-1"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = type === id;
        return (
          <button
            key={id}
            onClick={() => setType(id)}
            className={`flex items-center gap-2 py-2.5 px-7 rounded-xl text-sm font-semibold transition-all duration-250
              ${active ? 'text-white' : 'text-muted hover:text-white'}`}
            style={
              active
                ? {
                    background: 'linear-gradient(135deg, #6C5CE7, #5a4bd1)',
                    boxShadow: '0 4px 20px rgba(108,92,231,0.4)',
                  }
                : {}
            }
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
