import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function InstallBanner() {
    const { isInstallable, promptInstall, dismissPrompt } = usePWAInstall();
    // Check if user previously dismissed forever (in a real app, you might want to expire this)
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
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="max-w-md mx-auto bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
                <div className="flex-1">
                    <h3 className="text-white font-bold text-sm mb-1">Install App</h3>
                    <p className="text-white/60 text-xs leading-snug">
                        Add Gravity Pomodoro to your home screen for a better full-screen experience.
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={promptInstall}
                        className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl active:scale-95 transition-transform"
                    >
                        Get
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="px-4 py-2 bg-white/5 text-white/60 font-medium text-xs rounded-xl active:scale-95 transition-transform"
                    >
                        Not Now
                    </button>
                </div>
            </div>
        </div>
    );
}
