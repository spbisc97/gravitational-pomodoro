import { useEffect, useRef } from 'react';

export const useWakeLock = (isActive: boolean) => {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && isActive) {
                try {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                    wakeLockRef.current.addEventListener('release', () => {
                        console.log('Wake Lock was released');
                    });
                    console.log('Wake Lock is active');
                } catch (err: any) {
                    console.error(`${err.name}, ${err.message}`);
                }
            }
        };

        const releaseWakeLock = async () => {
            if (wakeLockRef.current !== null) {
                try {
                    await wakeLockRef.current.release();
                    wakeLockRef.current = null;
                    console.log('Wake Lock released manually');
                } catch (err: any) {
                    console.error(`${err.name}, ${err.message}`);
                }
            }
        };

        if (isActive) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        // Handle visibility changes (wake lock is automatically released when page is hidden)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isActive) {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [isActive]);
};
