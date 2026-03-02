import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  Target, Coffee, RotateCcw, Lock, Unlock,
  Clock, Activity, ChevronLeft, ChevronRight, Box
} from 'lucide-react';

/**
 * 6-FACE SPATIAL STATE MACHINE HOOK
 * Logic: 
 * - Tilt Left (g_x < -0.6): ACTIVE (Start/Resume)
 * - Tilt Right (g_x > 0.6): PAUSE
 * - Upright (g_y > 0.6): NEUTRAL / CLOCK
 */

import { useGravitySensor } from './hooks/useGravitySensor';

/**
 * MAIN APPLICATION
 */

const App: React.FC = () => {
  const { g, face, hasPermission, requestPermission } = useGravitySensor();

  const [isLocked, setIsLocked] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [systemTime, setSystemTime] = useState(new Date());

  // Use localStorage to persist settings between sessions
  const [timerSettings, _setTimerSettings] = useLocalStorage('gravity-timer-settings', {
    defaultWorkSeconds: 1500,
    defaultBreakSeconds: 300
  });

  const [timerState, setTimerState] = useState({
    workSeconds: timerSettings.defaultWorkSeconds,
    breakSeconds: timerSettings.defaultBreakSeconds,
    mode: 'WORK' as 'WORK' | 'BREAK'
  });

  // Analytics: Track total focus time (in seconds)
  const [totalFocusedTime, setTotalFocusedTime] = useLocalStorage('gravity-total-focus', 0);

  // Sync state if settings change (only when not running)
  useEffect(() => {
    if (!isRunning) {
      setTimerState(s => ({
        ...s,
        workSeconds: timerSettings.defaultWorkSeconds,
        breakSeconds: timerSettings.defaultBreakSeconds
      }));
    }
  }, [timerSettings, isRunning]);

  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  }, []);

  const notify = useCallback((style: 'start' | 'pause' | 'done') => {
    if ('vibrate' in navigator) {
      if (style === 'start') navigator.vibrate(50);
      else if (style === 'pause') navigator.vibrate([30, 30]);
      else navigator.vibrate([500, 100, 500]);
    }
  }, []);

  // Spatial State Machine - Now mapped to "Left for Active" and "Right for Pause"
  useEffect(() => {
    if (!hasPermission || isLocked) return;

    if (face === 'LEFT' && !isRunning) {
      setIsRunning(true);
      notify('start');
      requestWakeLock();
    } else if (face === 'RIGHT' && isRunning) {
      setIsRunning(false);
      notify('pause');
      wakeLockRef.current?.release();
    }
  }, [face, hasPermission, isLocked, isRunning, notify, requestWakeLock]);

  // Timer Engine
  useEffect(() => {
    let interval: number;
    if (isRunning) {
      interval = window.setInterval(() => {
        setTimerState(prev => {
          const newState = { ...prev };
          const currentVal = prev.mode === 'WORK' ? prev.workSeconds : prev.breakSeconds;

          if (currentVal > 0) {
            if (prev.mode === 'WORK') {
              newState.workSeconds--;
              // Increment focus tracking
              setTotalFocusedTime(t => t + 1);
            }
            else newState.breakSeconds--;
          } else {
            notify('done');
            setIsRunning(false);
          }
          return newState;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, notify, setTotalFocusedTime]);

  useEffect(() => {
    const t = setInterval(() => setSystemTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center transition-all duration-1000 text-white p-6 font-sans ${isRunning ? (timerState.mode === 'WORK' ? 'bg-red-950' : 'bg-emerald-950') : 'bg-slate-950'}`}>

      {!hasPermission ? (
        <div className="bg-white/5 backdrop-blur-3xl p-12 rounded-[3rem] text-center border border-white/10 shadow-2xl">
          <Box className="w-12 h-12 mx-auto mb-6 text-indigo-400 animate-pulse" />
          <h1 className="text-3xl font-black mb-2 uppercase tracking-tighter">Gravity Switch</h1>
          <p className="text-white/40 mb-8 text-sm">Initialize the IMU to enable spatial control.</p>
          <button
            onClick={requestPermission}
            className="w-full py-4 bg-white text-black rounded-2xl font-bold active:scale-95 transition-all shadow-xl"
          >
            Start Session
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md flex flex-col items-center">

          {/* Header Indicators */}
          <div className="w-full flex justify-between items-center mb-16">
            <StatusIndicator icon={<ChevronLeft />} active={face === 'LEFT'} label="Active" />

            <div className="bg-white/5 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/10 shadow-lg">
              <span className="font-mono text-xl font-black tracking-widest">
                {systemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <StatusIndicator icon={<ChevronRight />} active={face === 'RIGHT'} label="Pause" />
          </div>

          {/* Main Visual Hierarchy */}
          <div className="relative flex flex-col items-center">
            <div className="flex items-center gap-2 mb-6 opacity-40 uppercase tracking-[0.5em] text-[10px] font-black">
              {isRunning ? <Activity size={14} className="text-green-400 animate-pulse" /> : <Clock size={14} />}
              {isRunning ? 'Counting Down' : 'Standing By'}
            </div>

            <div className={`transition-all duration-700 font-black leading-none tracking-tighter ${isRunning ? 'text-[12rem] drop-shadow-[0_0_80px_rgba(255,255,255,0.15)]' : 'text-8xl opacity-10 blur-[1px]'}`}>
              {formatTime(timerState.mode === 'WORK' ? timerState.workSeconds : timerState.breakSeconds)}
            </div>

            {/* Gravity Vector HUD (The Researcher View) */}
            <div className="mt-12 flex gap-6 font-mono text-[9px] opacity-30 bg-black/40 px-5 py-1.5 rounded-full border border-white/5">
              <span>X: {g.x.toFixed(2)}</span>
              <span>Y: {g.y.toFixed(2)}</span>
              <span>Z: {g.z.toFixed(2)}</span>
              <span className="text-indigo-300 font-bold">{face}</span>
            </div>
          </div>

          {/* Persistent Session Cards */}
          <div className="mt-20 w-full grid grid-cols-2 gap-4">
            <SessionCard
              active={timerState.mode === 'WORK'}
              time={formatTime(timerState.workSeconds)}
              label="Focus"
              icon={<Target size={16} />}
              activeColor="border-red-500/40 bg-red-500/5"
            />
            <SessionCard
              active={timerState.mode === 'BREAK'}
              time={formatTime(timerState.breakSeconds)}
              label="Rest"
              icon={<Coffee size={16} />}
              activeColor="border-emerald-500/40 bg-emerald-500/5"
            />
          </div>

          {/* Manual Control Cluster */}
          <div className="mt-12 flex gap-4">
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`p-6 rounded-[2rem] border-2 transition-all ${isLocked ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'}`}
            >
              {isLocked ? <Lock size={22} /> : <Unlock size={22} />}
            </button>

            <button
              onClick={() => setTimerState(s => ({ ...s, mode: s.mode === 'WORK' ? 'BREAK' : 'WORK' }))}
              className="px-10 py-5 rounded-[2rem] bg-white/5 border border-white/10 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-white/10 active:scale-95 transition-all"
            >
              Switch Mode
            </button>

            <button
              onClick={() => setTimerState(s => ({ ...s, workSeconds: timerSettings.defaultWorkSeconds, breakSeconds: timerSettings.defaultBreakSeconds }))}
              className="p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-red-500/20 active:scale-95 transition-all opacity-60 hover:opacity-100"
            >
              <RotateCcw size={22} />
            </button>
          </div>

          <div className="mt-8 text-[10px] uppercase tracking-widest opacity-40">
            Total Focus: {formatTime(totalFocusedTime)}
          </div>

        </div>
      )}
    </div>
  );
};

// --- Sub-components ---

const StatusIndicator = ({ icon, active, label }: { icon: any, active: boolean, label: string }) => (
  <div className={`flex flex-col items-center gap-1 transition-all duration-500 ${active ? 'text-indigo-400 scale-110 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 'opacity-10'}`}>
    {icon}
    <span className="text-[8px] font-bold uppercase tracking-widest">{label}</span>
  </div>
);

const SessionCard = ({ active, time, label, icon, activeColor }: any) => (
  <div className={`p-7 rounded-[3rem] border-2 transition-all backdrop-blur-md ${active ? `${activeColor} border-opacity-100 scale-105` : 'bg-white/5 border-transparent opacity-20'}`}>
    <div className="flex items-center gap-2 mb-3 opacity-60 font-bold uppercase text-[10px] tracking-widest">
      {icon} {label}
    </div>
    <div className="text-4xl font-mono font-black tracking-tighter">{time}</div>
  </div>
);

export default App;