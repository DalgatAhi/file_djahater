import { useState, useRef, useCallback, useEffect } from 'react';

export default function CompareSlider({ beforeSrc, afterSrc, containerStyle = {} }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  }, []);

  const startDrag = useCallback((e) => {
    isDragging.current = true;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    updatePosition(x);
    e.preventDefault();
  }, [updatePosition]);

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      updatePosition(x);
    };
    const onEnd = () => { isDragging.current = false; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [updatePosition]);

  return (
    <div
      ref={containerRef}
      className="relative select-none overflow-hidden rounded-2xl"
      style={{ cursor: 'col-resize', touchAction: 'none', background: 'rgba(0,0,0,0.3)', ...containerStyle }}
      onMouseDown={startDrag}
      onTouchStart={startDrag}
    >
      {/* After image — sets the container height */}
      <img
        src={afterSrc}
        alt="После"
        className="w-full h-auto block"
        draggable={false}
      />

      {/* Before image clipped with clip-path */}
      <img
        src={beforeSrc}
        alt="До"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: `${position}%`,
          transform: 'translateX(-50%)',
          width: '2px',
          background: 'linear-gradient(180deg, #6C5CE7 0%, #00D2FF 100%)',
        }}
      />

      {/* Drag handle */}
      <div
        className="absolute top-1/2 pointer-events-none flex items-center justify-center rounded-full"
        style={{
          left: `${position}%`,
          transform: 'translate(-50%, -50%)',
          width: '44px',
          height: '44px',
          background: 'linear-gradient(135deg, #6C5CE7, #00D2FF)',
          boxShadow: '0 4px 24px rgba(108,92,231,0.7), 0 0 0 3px rgba(255,255,255,0.15)',
          transition: 'box-shadow 0.2s',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M6.5 9L3 5.5V12.5L6.5 9Z" fill="white"/>
          <path d="M11.5 9L15 5.5V12.5L11.5 9Z" fill="white"/>
          <line x1="9" y1="2" x2="9" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Labels */}
      <span
        className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold text-white pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      >
        До
      </span>
      <span
        className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold text-white pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      >
        После
      </span>
    </div>
  );
}
