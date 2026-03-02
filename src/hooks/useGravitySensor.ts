import { useState, useEffect, useRef, useMemo } from 'react';

export type Face = 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'UNKNOWN';

interface GravityData {
    g: { x: number; y: number; z: number };
    face: Face;
    orientation: { alpha: number; beta: number; gamma: number };
    hasPermission: boolean;
    requestPermission: () => Promise<void>;
    setManualOrientation: (o: { alpha: number; beta: number; gamma: number }) => void;
}

// Helper: Convert degrees to radians
const degToRad = (deg: number) => (deg * Math.PI) / 180;

export const eulerToGravity = (orientation: { alpha: number, beta: number, gamma: number }) => {
    const b = degToRad(orientation.beta);
    const g = degToRad(orientation.gamma);

    return {
        // Tilting left/right mainly affects X
        x: Math.sin(g) * Math.cos(b),

        // Tilting forward/backward mainly affects Y
        y: Math.sin(b),

        // Face up / Face down affects Z
        z: Math.cos(b) * Math.cos(g)
    };
};

export const useGravitySensor = (alphaPass = 0.2): GravityData => {
    const [hasPermission, setHasPermission] = useState(false);
    const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });

    // Low-pass filter for gravity vector
    const lastGRef = useRef<{ x: number, y: number, z: number }>({ x: 0, y: 0, z: 0 });

    useEffect(() => {
        if (!hasPermission) return;

        const handleOrientation = (e: DeviceOrientationEvent) => {
            // Some devices might report null if sensors aren't active yet
            setOrientation({
                alpha: e.alpha || 0,
                beta: e.beta || 0,
                // Gamma can exceed 90 on some Android devices when flipping over, wrap it or accept it
                gamma: e.gamma || 0
            });
        };

        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, [hasPermission]);

    // Calculate Gravity Vector g from orientation
    const g = useMemo(() => {
        const rawG = eulerToGravity(orientation);

        // Apply Low-Pass Filter: g_filtered = alpha * g_new + (1 - alpha) * g_prev
        const filteredX = alphaPass * rawG.x + (1 - alphaPass) * lastGRef.current.x;
        const filteredY = alphaPass * rawG.y + (1 - alphaPass) * lastGRef.current.y;
        const filteredZ = alphaPass * rawG.z + (1 - alphaPass) * lastGRef.current.z;

        const filteredG = { x: filteredX, y: filteredY, z: filteredZ };
        lastGRef.current = filteredG;

        return filteredG;
    }, [orientation, alphaPass]);

    // Determine dominant axis (The "Cube Face") intuitively for a user's hand/desk
    const face = useMemo((): Face => {
        const { beta, gamma } = orientation;

        // If device is roughly flat on a table (face up)
        if (Math.abs(beta) < 30 && Math.abs(gamma) < 30) return 'FRONT';

        // If device is upside down flat on a table (face down)
        if (Math.abs(beta) > 150) return 'BACK';

        // Tilted left (gamma approaches -90, e.g., resting on left side)
        if (gamma < -40) return 'LEFT';

        // Tilted right (gamma approaches 90, e.g., resting on right side)
        if (gamma > 40) return 'RIGHT';

        // Standing upright (e.g., in a portrait charging dock)
        if (beta > 40) return 'UP';

        // Upside down portrait
        if (beta < -40) return 'DOWN';

        return 'UNKNOWN';
    }, [orientation]);

    const requestPermission = async () => {
        if (typeof DeviceOrientationEvent === 'undefined') {
            console.warn("DeviceOrientationEvent is not supported on this device/browser.");
            alert("Device orientation sensors are not supported (requires HTTPS on mobile).");
            setHasPermission(true);
            return;
        }

        const req = (DeviceOrientationEvent as any).requestPermission;
        if (typeof req === 'function') {
            try {
                const res = await req();
                if (res === 'granted') setHasPermission(true);
                else alert("Permission to access device orientation was denied.");
            } catch (e) {
                console.error("DeviceOrientation permission error:", e);
                alert("Error requesting orientation permission. Ensure you are on HTTPS (Try restarting your dev server!).");
                setHasPermission(true);
            }
        } else {
            // Non-iOS 13+ devices (Android) don't require explicit user action
            setHasPermission(true);
        }
    };

    const setManualOrientation = (o: { alpha: number; beta: number; gamma: number }) => {
        setOrientation(o);
    };

    return { g, face, orientation, hasPermission, requestPermission, setManualOrientation };
};