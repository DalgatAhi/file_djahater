import { useEffect, useState } from 'react';

export default function ProgressBar({ active }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }

    // Simulate realistic progress: fast start, slow towards 90%, never reaches 100
    let current = 0;
    const intervals = [
      { target: 30, speed: 80 },
      { target: 60, speed: 150 },
      { target: 85, speed: 300 },
      { target: 92, speed: 600 },
    ];
    let phase = 0;

    const tick = () => {
      const { target, speed } = intervals[phase] || intervals[intervals.length - 1];
      current = Math.min(current + 1, target);
      setProgress(current);
      if (current >= target && phase < intervals.length - 1) phase++;
    };

    const id = setInterval(tick, 30);
    return () => clearInterval(id);
  }, [active]);

  if (!active && progress === 0) return null;

  return (
    <div className="w-full mt-4 animate-fade-in">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted">Обрабатываем изображение...</span>
        <span className="text-xs font-semibold text-accent">{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full progress-bar transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
