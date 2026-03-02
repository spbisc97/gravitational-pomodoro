import { useState, useEffect, useRef, useMemo } from 'react';

export type Face = 'LEFT' | 'RIGHT' | 'UP' | 'FLAT' | 'UNKNOWN';

export const useGravitySensor = () => {
    const [hasPermission, setHasPermission] = useState(false);
    const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
    const isManualRef = useRef(false);

    // Listen to real hardware events (disabled when sliders are used)
    useEffect(() => {
        if (!hasPermission) return;
        const handler = (e: DeviceOrientationEvent) => {
            if (isManualRef.current) return;
            if (e.alpha === null && e.beta === null && e.gamma === null) return;
            setOrientation({ alpha: e.alpha || 0, beta: e.beta || 0, gamma: e.gamma || 0 });
        };
        window.addEventListener('deviceorientation', handler);
        return () => window.removeEventListener('deviceorientation', handler);
    }, [hasPermission]);

    // Face detection from beta/gamma angles
    const face = useMemo((): Face => {
        const { beta, gamma } = orientation;
        if (gamma < -40) return 'LEFT';
        if (gamma > 40) return 'RIGHT';
        if (beta > 40) return 'UP';
        if (Math.abs(beta) < 30 && Math.abs(gamma) < 30) return 'FLAT';
        return 'UNKNOWN';
    }, [orientation]);

    const requestPermission = async () => {
        const req = (DeviceOrientationEvent as any).requestPermission;
        if (typeof req === 'function') {
            try {
                const res = await req();
                if (res === 'granted') setHasPermission(true);
            } catch { setHasPermission(true); }
        } else {
            setHasPermission(true);
        }
    };

    const setManual = (o: typeof orientation) => {
        isManualRef.current = true;
        setOrientation(o);
    };

    return { face, orientation, hasPermission, requestPermission, setManual };
};