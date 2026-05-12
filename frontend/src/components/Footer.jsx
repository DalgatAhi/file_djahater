import { Zap, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6C5CE7, #00D2FF)' }}>
            <Zap size={13} className="text-white" fill="white" />
          </div>
          <span className="text-white font-bold">File<span className="gradient-text-accent">Lite</span></span>
        </div>

        <p className="text-xs text-muted text-center">
          Сделано с <Heart size={11} className="inline text-red-400 mx-0.5" fill="currentColor" /> · Файлы удаляются сразу после скачивания
        </p>

        <p className="text-xs text-muted">© 2025 FileLite</p>
      </div>
    </footer>
  );
}
