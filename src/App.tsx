import { useState, useEffect } from 'react';
import { useGravitySensor } from './hooks/useGravitySensor';

const App = () => {
  const { face, orientation, hasPermission, requestPermission, setManual } = useGravitySensor();

  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'WORK' | 'BREAK'>('WORK');
  const [seconds, setSeconds] = useState(1500);

  // State machine: LEFT=work, UP=pause, RIGHT=break
  useEffect(() => {
    if (!hasPermission) return;

    if (face === 'LEFT' && !isRunning) {
      if (mode !== 'WORK') { setMode('WORK'); setSeconds(1500); }
      setIsRunning(true);
    }

    if (face === 'RIGHT' && (mode !== 'BREAK' || !isRunning)) {
      setMode('BREAK');
      setSeconds(300);
      setIsRunning(true);
    }

    if (face === 'UP' && isRunning) {
      setIsRunning(false);
    }
  }, [face, hasPermission, isRunning, mode]);

  // Countdown
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const fmt = (s: number) => {
    const neg = s < 0;
    const a = Math.abs(s);
    return `${neg ? '-' : ''}${Math.floor(a / 60)}:${(a % 60).toString().padStart(2, '0')}`;
  };

  // Dynamic theme
  const theme = isRunning
    ? mode === 'WORK'
      ? { bg: 'from-red-950 via-red-900/80 to-red-950', accent: 'text-red-400', glow: 'drop-shadow-[0_0_60px_rgba(239,68,68,0.3)]', ring: 'ring-red-500/30' }
      : { bg: 'from-emerald-950 via-emerald-900/80 to-emerald-950', accent: 'text-emerald-400', glow: 'drop-shadow-[0_0_60px_rgba(52,211,153,0.3)]', ring: 'ring-emerald-500/30' }
    : { bg: 'from-slate-950 via-slate-900 to-slate-950', accent: 'text-slate-400', glow: '', ring: 'ring-white/5' };

  // --- Permission screen ---
  if (!hasPermission) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-slate-950 to-slate-900 text-white flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-6xl animate-pulse">◎</div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Gravity Pomodoro</h1>
        <p className="text-sm text-white/30 text-center max-w-xs">Tilt your device to control focus sessions with physical gestures.</p>
        <button
          onClick={requestPermission}
          className="mt-4 px-10 py-4 bg-white text-black rounded-2xl font-bold text-lg active:scale-95 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.1)]"
        >
          Start Session
        </button>
      </div>
    );
  }

  // --- Main UI ---
  return (
    <div className={`min-h-dvh text-white flex flex-col items-center justify-center p-6 font-mono transition-all duration-700 bg-gradient-to-b ${theme.bg} overflow-auto`}>

      {/* Clock */}
      <div className="text-lg tracking-[0.3em] opacity-20 mb-12 font-light">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>

      {/* Tilt Indicators */}
      <div className="flex items-center gap-8 mb-10">
        <TiltIndicator label="Work" symbol="◂" active={face === 'LEFT'} color="text-red-400" />
        <TiltIndicator label="Pause" symbol="▴" active={face === 'UP'} color="text-slate-400" />
        <TiltIndicator label="Break" symbol="▸" active={face === 'RIGHT'} color="text-emerald-400" />
      </div>

      {/* Status pill */}
      <div className={`text-[10px] uppercase tracking-[0.4em] px-5 py-1.5 rounded-full mb-6 transition-all duration-500 ${isRunning
        ? `${theme.accent} bg-white/5 ring-1 ${theme.ring}`
        : 'text-white/30'
        }`}>
        {isRunning ? `▶ ${mode}` : `⏸ ${mode}`}
      </div>

      {/* Timer — the hero */}
      <div
        onClick={() => setIsRunning(r => !r)}
        className={`cursor-pointer select-none transition-all duration-500 font-black leading-none tracking-tighter active:scale-95 ${theme.glow} ${isRunning ? 'text-6xl sm:text-7xl md:text-8xl scale-100' : 'text-4xl sm:text-5xl md:text-7xl opacity-30 blur-[0.5px]'
          } ${seconds < 0 ? 'animate-pulse text-red-400' : ''}`}
      >
        {fmt(seconds)}
      </div>

      {/* Subtle face + angle debug */}
      <div className="mt-10 flex items-center gap-4">
        <span className={`text-sm font-bold transition-colors duration-300 ${theme.accent}`}>{face}</span>
        <span className="text-[10px] opacity-20">
          α:{Math.round(orientation.alpha)}° β:{Math.round(orientation.beta)}° γ:{Math.round(orientation.gamma)}°
        </span>
      </div>

      {/* Reset */}
      <button
        onClick={() => { setSeconds(1500); setMode('WORK'); setIsRunning(false); }}
        className="mt-8 px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-[0.3em] bg-white/5 ring-1 ring-white/10 hover:bg-white/10 active:scale-95 transition-all opacity-40 hover:opacity-80"
      >
        ↺ Reset
      </button>

      {/* Debug Sliders */}
      <div className="mt-14 w-full max-w-sm space-y-3 bg-white/[0.02] ring-1 ring-white/5 rounded-2xl p-5">
        <div className="text-[9px] uppercase tracking-[0.3em] opacity-25 mb-3">🛠 Debug Orientation</div>
        {[
          { label: 'α Yaw', key: 'alpha' as const, min: 0, max: 360 },
          { label: 'β Pitch', key: 'beta' as const, min: -180, max: 180 },
          { label: 'γ Roll', key: 'gamma' as const, min: -90, max: 90 },
        ].map(({ label, key, min, max }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-[10px] w-14 opacity-40">{label}</span>
            <input
              type="range" min={min} max={max}
              value={orientation[key]}
              onChange={e => setManual({ ...orientation, [key]: Number(e.target.value) })}
              className="flex-1 accent-indigo-500 h-1 opacity-60"
            />
            <span className="text-[10px] w-10 text-right opacity-30 tabular-nums">{Math.round(orientation[key])}°</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Tilt direction indicator ---
const TiltIndicator = ({ label, symbol, active, color }: { label: string; symbol: string; active: boolean; color: string }) => (
  <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? `${color} scale-125 drop-shadow-[0_0_12px_currentColor]` : 'opacity-10 scale-90'
    }`}>
    <span className="text-2xl">{symbol}</span>
    <span className="text-[8px] uppercase tracking-[0.2em] font-bold">{label}</span>
  </div>
);

export default App;