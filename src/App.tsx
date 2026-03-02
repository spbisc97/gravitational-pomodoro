import { useState, useEffect, useCallback } from 'react';
import { useGravitySensor } from './hooks/useGravitySensor';

const App = () => {
  const { face, orientation, hasPermission, requestPermission, setManual } = useGravitySensor();

  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(1500);

  // State machine: LEFT=run, RIGHT/UP=pause
  useEffect(() => {
    if (!hasPermission) return;
    if (face === 'LEFT' && !isRunning) setIsRunning(true);
    if ((face === 'RIGHT' || face === 'UP') && isRunning) setIsRunning(false);
  }, [face, hasPermission, isRunning]);

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

  // --- Permission screen ---
  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <button onClick={requestPermission} className="px-8 py-4 bg-white text-black rounded-2xl font-bold text-lg">
          Start Session
        </button>
      </div>
    );
  }

  // --- Main UI ---
  return (
    <div className={`min-h-screen text-white flex flex-col items-center justify-center p-6 font-mono transition-colors duration-500 ${isRunning ? 'bg-red-950' : 'bg-slate-950'}`}>

      {/* Status */}
      <div className="text-sm opacity-50 uppercase tracking-widest mb-4">
        {isRunning ? '▶ Running' : '⏸ Paused'}
      </div>

      {/* Timer */}
      <div
        onClick={() => setIsRunning(r => !r)}
        className={`text-8xl font-black cursor-pointer transition-all ${seconds < 0 ? 'text-red-400' : ''}`}
      >
        {fmt(seconds)}
      </div>

      {/* Face indicator */}
      <div className="mt-8 text-2xl font-bold">
        Face: <span className="text-indigo-400">{face}</span>
      </div>

      {/* Raw angles */}
      <div className="mt-2 text-xs opacity-40">
        α:{Math.round(orientation.alpha)}° β:{Math.round(orientation.beta)}° γ:{Math.round(orientation.gamma)}°
      </div>

      {/* Reset */}
      <button
        onClick={() => { setSeconds(1500); setIsRunning(false); }}
        className="mt-8 px-6 py-2 bg-white/10 rounded-xl text-sm"
      >
        Reset
      </button>

      {/* Debug Sliders */}
      <div className="mt-12 w-full max-w-sm space-y-3">
        <div className="text-xs opacity-40 uppercase tracking-widest">🛠 Debug Sliders</div>
        {[
          { label: 'α Alpha', key: 'alpha' as const, min: 0, max: 360 },
          { label: 'β Beta', key: 'beta' as const, min: -180, max: 180 },
          { label: 'γ Gamma', key: 'gamma' as const, min: -90, max: 90 },
        ].map(({ label, key, min, max }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs w-16 opacity-60">{label}</span>
            <input
              type="range" min={min} max={max}
              value={orientation[key]}
              onChange={e => setManual({ ...orientation, [key]: Number(e.target.value) })}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs w-10 text-right opacity-60">{Math.round(orientation[key])}°</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;