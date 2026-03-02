import { useState, useEffect } from 'react';
import { useGravitySensor } from './hooks/useGravitySensor';

const App = () => {
  const { face, orientation, hasPermission, requestPermission, setManual } = useGravitySensor();

  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'WORK' | 'BREAK'>('WORK');
  const [seconds, setSeconds] = useState(1500);
  const [cycle, setCycle] = useState(1);  // Current pomodoro cycle (1-4)

  // State machine: LEFT=work, UP=pause, RIGHT=break
  useEffect(() => {
    if (!hasPermission) return;

    if (face === 'LEFT' && !isRunning) {
      if (mode !== 'WORK') {
        setMode('WORK');
        setSeconds(1500);
      }
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

  // Countdown + auto-cycle
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          // Timer hit zero — auto-advance
          if (mode === 'WORK') {
            setMode('BREAK');
            return cycle === 4 ? 900 : 300; // 15 min long break on 4th cycle, 5 min otherwise
          } else {
            // Break ended → next work cycle
            setMode('WORK');
            if (cycle >= 4) setCycle(1); else setCycle(c => c + 1);
            return 1500;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, mode, cycle]);

  const fmt = (s: number) => {
    const a = Math.abs(s);
    return `${Math.floor(a / 60).toString().padStart(2, '0')}:${(a % 60).toString().padStart(2, '0')}`;
  };

  // Theme colors
  const isWork = mode === 'WORK';
  const accent = isRunning
    ? isWork ? '#ef4444' : '#34d399'
    : '#64748b';

  // --- Permission screen ---
  if (!hasPermission) {
    return (
      <div className="min-h-dvh bg-[#0a0e1a] text-white flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-7xl">◎</div>
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tight mb-2">Gravity Pomodoro</h1>
          <p className="text-sm text-white/30 max-w-[280px]">Tilt your device to control focus sessions.</p>
        </div>
        <button
          onClick={requestPermission}
          className="px-10 py-4 bg-white text-black rounded-2xl font-bold text-base active:scale-95 transition-transform"
        >
          Start Session
        </button>
      </div>
    );
  }

  // --- Main UI ---
  return (
    <div className="h-dvh bg-[#0a0e1a] text-white flex flex-col items-center px-6 py-8 overflow-auto">

      {/* Top bar: clock + cycle dots */}
      <div className="flex flex-col items-center gap-4">
        <div className="text-base tracking-[0.4em] text-white/20 font-light">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full transition-all duration-500"
              style={{
                backgroundColor: i <= cycle ? accent : 'rgba(255,255,255,0.08)',
                boxShadow: i === cycle && isRunning ? `0 0 8px ${accent}` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Center: timer + indicators (takes remaining space, vertically centered) */}
      <div className="flex-1 flex flex-col items-center justify-center">

        {/* Tilt indicators */}
        <div className="flex items-end gap-10 mb-6">
          <TiltIndicator label="Work" symbol="◂" active={face === 'LEFT'} color="#ef4444" />
          <TiltIndicator label="Pause" symbol="▴" active={face === 'UP'} color="#64748b" />
          <TiltIndicator label="Break" symbol="▸" active={face === 'RIGHT'} color="#34d399" />
        </div>

        {/* Mode label */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
          <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">
            {isRunning ? `${mode}` : `Paused · ${mode}`}
          </span>
        </div>

        {/* Timer — the hero */}
        <div
          onClick={() => setIsRunning(r => !r)}
          className="cursor-pointer select-none active:scale-95 transition-all duration-300"
        >
          <span
            className="font-black leading-none tracking-tight block transition-all duration-500"
            style={{
              fontSize: isRunning ? 'clamp(5rem, 22vw, 9rem)' : 'clamp(3.5rem, 16vw, 6rem)',
              color: isRunning ? accent : 'rgba(255,255,255,0.2)',
              textShadow: isRunning ? `0 0 40px ${accent}40` : 'none',
            }}
          >
            {fmt(seconds)}
          </span>
        </div>

        {/* Face + angle debug */}
        <div className="mt-4 flex items-center gap-3 text-white/25">
          <span className="text-sm font-bold" style={{ color: accent }}>{face}</span>
          <span className="text-[10px] font-mono">
            α:{Math.round(orientation.alpha)}° β:{Math.round(orientation.beta)}° γ:{Math.round(orientation.gamma)}°
          </span>
        </div>

        {/* Reset */}
        <button
          onClick={() => { setSeconds(1500); setMode('WORK'); setCycle(1); setIsRunning(false); }}
          className="mt-4 px-5 py-2 rounded-full text-[10px] uppercase tracking-[0.25em] text-white/30 ring-1 ring-white/10 hover:ring-white/20 active:scale-95 transition-all"
        >
          ↺ Reset
        </button>
      </div>

      {/* Bottom: Debug Sliders */}
      <div className="w-full max-w-xs mx-auto mb-4 bg-white/[0.03] ring-1 ring-white/5 rounded-2xl p-4 space-y-2.5">
        <div className="text-[8px] uppercase tracking-[0.3em] text-white/15 mb-2">Debug Orientation</div>
        {[
          { label: 'α', key: 'alpha' as const, min: 0, max: 360 },
          { label: 'β', key: 'beta' as const, min: -180, max: 180 },
          { label: 'γ', key: 'gamma' as const, min: -90, max: 90 },
        ].map(({ label, key, min, max }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] w-4 text-white/20">{label}</span>
            <input
              type="range" min={min} max={max}
              value={orientation[key]}
              onChange={e => setManual({ ...orientation, [key]: Number(e.target.value) })}
              className="flex-1 accent-indigo-500 h-1 opacity-50"
            />
            <span className="text-[9px] w-8 text-right text-white/15 tabular-nums font-mono">{Math.round(orientation[key])}°</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Tilt direction indicator ---
const TiltIndicator = ({ label, symbol, active, color }: { label: string; symbol: string; active: boolean; color: string }) => (
  <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'scale-110' : 'opacity-15 scale-90'
    }`}>
    <span
      className="text-2xl transition-all duration-300"
      style={{ color: active ? color : undefined, filter: active ? `drop-shadow(0 0 8px ${color})` : 'none' }}
    >
      {symbol}
    </span>
    <span className="text-[7px] uppercase tracking-[0.2em] font-bold">{label}</span>
  </div>
);

export default App;