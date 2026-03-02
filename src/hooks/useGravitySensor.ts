import { useState, useEffect, useMemo, useRef } from 'react';

export type Face = 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'UNKNOWN';

interface GravityData {
    g: { x: number; y: number; z: number };
    face: Face;
    orientation: { alpha: number; beta: number; gamma: number };
}

// Helper: Convert degrees to radians
const degToRad = (deg: number) => (deg * Math.PI) / 180;

export const useGravitySensor = (alphaPass = 0.2) => {
    // We now also track alpha (yaw) for complete quaternion calculation,
    // though gravity primarily relies on beta & gamma.
    const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
    const [hasPermission, setHasPermission] = useState(false);

    // Ref to track stable state for the low-pass filter
    const lastGRef = useRef<{ x: number, y: number, z: number }>({ x: 0, y: 0, z: 0 });

    // Calculate Gravity Vector g from Quaternions to prevent Gimbal Lock
    const g = useMemo(() => {
        // 1. Convert Euler angles to Radians
        const heading = degToRad(orientation.alpha); // Z
        const attitude = degToRad(orientation.beta);  // X
        const bank = degToRad(orientation.gamma);     // Y

        // 2. Compute Half Angles
        const c1 = Math.cos(heading / 2);
        const c2 = Math.cos(attitude / 2);
        const c3 = Math.cos(bank / 2);
        const s1 = Math.sin(heading / 2);
        const s2 = Math.sin(attitude / 2);
        const s3 = Math.sin(bank / 2);

        // 3. Construct the Quaternion (q = w + xi + yj + zk)
        // Note: W3C device orientation uses Tait-Bryan angles (Z-X'-Y'')
        const w = c1 * c2 * c3 - s1 * s2 * s3;
        const x = s1 * s2 * c3 + c1 * c2 * s3;
        const y = s1 * c2 * c3 + c1 * s2 * s3;
        const z = c1 * s2 * c3 - s1 * c2 * s3;

        // 4. Rotate the standard gravity vector (0, 0, 1) by the quaternion
        // Mathematical equivalent extracting the Z column of the rotation matrix
        const rawX = 2 * (x * z - w * y);
        const rawY = 2 * (y * z + w * x);
        const rawZ = w * w - x * x - y * y + z * z;

        // 5. Apply Low-Pass Filter: g_filtered = alpha * g_new + (1 - alpha) * g_prev
        const filteredX = alphaPass * rawX + (1 - alphaPass) * lastGRef.current.x;
        const filteredY = alphaPass * rawY + (1 - alphaPass) * lastGRef.current.y;
        const filteredZ = alphaPass * rawZ + (1 - alphaPass) * lastGRef.current.z;

        const filteredG = { x: filteredX, y: filteredY, z: filteredZ };
        lastGRef.current = filteredG;

        return filteredG;
    }, [orientation, alphaPass]);

    // Determine dominant axis (The "Cube Face")
    const face = useMemo((): Face => {
        const { x, y, z } = g;
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        const absZ = Math.abs(z);

        // Threshold for "flat" or un-oriented states
        if (absX < 0.2 && absY < 0.2 && absZ < 0.2) return 'UNKNOWN';

        let detected: Face = 'UNKNOWN';
        if (absX > absY && absX > absZ) detected = x > 0 ? 'RIGHT' : 'LEFT';
        else if (absY > absX && absY > absZ) detected = y > 0 ? 'DOWN' : 'UP';
        else detected = z > 0 ? 'FRONT' : 'BACK';

        return detected;
    }, [g]);

    useEffect(() => {
        const handleOrientation = (e: DeviceOrientationEvent) => {
            setOrientation({
                alpha: e.alpha || 0,
                beta: e.beta || 0,
                gamma: e.gamma || 0
            });
        };

        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

    const requestPermission = async () => {
        const req = (DeviceOrientationEvent as any).requestPermission;
        if (typeof req === 'function') {
            try {
                const res = await req();
                if (res === 'granted') setHasPermission(true);
            } catch (e) {
                console.error("DeviceOrientation permission denied or error:", e);
            }
        } else {
            // Non-iOS 13+ devices don't require explicit user action
            setHasPermission(true);
        }
    };

    return { g, face, hasPermission, requestPermission };
};