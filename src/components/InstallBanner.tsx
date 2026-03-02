import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function InstallBanner() {
    const { isInstallable, promptInstall, dismissPrompt } = usePWAInstall();
    const [hasDismissed, setHasDismissed] = useState(
        () => localStorage.getItem('pwa_prompt_dismissed') === 'true'
    );

    if (!isInstallable || hasDismissed) return null;

    const handleDismiss = () => {
        dismissPrompt();
        setHasDismissed(true);
        localStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50 animate-in slide-in-from-bottom-8 fade-in duration-500 ease-out">
            <div className="relative overflow-hidden bg-[#0a0e1a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center p-3 pl-4 pr-3 gap-3 group">

                {/* Subtle gradient background effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-50 pointer-events-none" />

                {/* Simulated App Icon */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e293b] to-black border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                    <span className="text-xl text-white">◎</span>
                </div>

                {/* Text Context */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm tracking-tight truncate">Gravity Pomodoro</h3>
                    <p className="text-white/50 text-[11px] font-medium truncate">Install on home screen</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={promptInstall}
                        className="px-3 py-1.5 bg-white text-black font-semibold text-xs rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all"
                    >
                        Install
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-full transition-colors active:scale-95"
                        aria-label="Dismiss"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
