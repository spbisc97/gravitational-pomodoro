import { useState, useEffect, useMemo, useRef } from 'react';

export type Face = 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'UNKNOWN';

interface GravityData {
    g: { x: number; y: number; z: number };
    face: Face;
    orientation: { beta: number; gamma: number };
}

export const useGravitySensor = (threshold = 0.6) => {
    const [orientation, setOrientation] = useState({ beta: 0, gamma: 0 });
    const [hasPermission, setHasPermission] = useState(false);

    // Ref to track stable state for debouncing
    const lastFaceRef = useRef<Face>('UNKNOWN');

    // Calculate Gravity Vector g from Euler angles
    // Mapping: Beta (pitch) and Gamma (roll) to Cartesian coordinates
    const g = useMemo(() => {
        const b = (orientation.beta * Math.PI) / 180;
        const g_rad = (orientation.gamma * Math.PI) / 180;

        return {
            x: Math.sin(g_rad) * Math.cos(b),
            y: -Math.sin(b),
            z: Math.cos(g_rad) * Math.cos(b)
        };
    }, [orientation]);

    // Determine dominant axis (The "Cube Face")
    const face = useMemo((): Face => {
        const { x, y, z } = g;
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        const absZ = Math.abs(z);

        let detected: Face = 'UNKNOWN';
        if (absX > absY && absX > absZ) detected = x > 0 ? 'RIGHT' : 'LEFT';
        else if (absY > absX && absY > absZ) detected = y > 0 ? 'DOWN' : 'UP';
        else detected = z > 0 ? 'FRONT' : 'BACK';

        return detected;
    }, [g]);

    useEffect(() => {
        const handleOrientation = (e: DeviceOrientationEvent) => {
            setOrientation({ beta: e.beta || 0, gamma: e.gamma || 0 });
        };

        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

    const requestPermission = async () => {
        const req = (DeviceOrientationEvent as any).requestPermission;
        if (typeof req === 'function') {
            const res = await req();
            if (res === 'granted') setHasPermission(true);
        } else {
            setHasPermission(true);
        }
    };

    return { g, face, hasPermission, requestPermission };
};