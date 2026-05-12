import { useState, useEffect } from 'react';
import { Zap, Menu, X } from 'lucide-react';

export default function Navbar({ onStart }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    { label: 'Возможности', href: '#features' },
    { label: 'Как работает', href: '#how' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b border-white/5' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
            style={{ background: 'linear-gradient(135deg, #6C5CE7, #00D2FF)' }}>
            <Zap size={16} className="text-white" fill="white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            File<span className="gradient-text-accent">Lite</span>
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-muted hover:text-white transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA Button */}
        <div className="hidden md:block">
          <button onClick={onStart} className="btn-primary text-sm py-2 px-5">
            Начать
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-muted hover:text-white transition-colors"
          onClick={() => setMenuOpen(v => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-white/5 px-4 py-4 flex flex-col gap-4 animate-fade-in">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-muted hover:text-white transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <button onClick={() => { onStart(); setMenuOpen(false); }} className="btn-primary text-sm py-2 w-full justify-center">
            Начать
          </button>
        </div>
      )}
    </nav>
  );
}
