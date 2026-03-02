# Gemini Instructions

This file contains custom instructions, rules, and context for the AI assistant working on this project.

## Project Context
- **Project:** Gravitational Pomodoro
- **Stack:** React, Vite, Tailwind CSS v4
- **Native Bridge:** Capacitor.js

Gravitational Pomodoro (Project Overview)

### 1. Concept

A software-based "Gravity Switch" productivity tool designed to mimic the tactile experience of high-end hardware timers (like the Ticktime TK3). The app transforms a smartphone or tablet into a physical control interface for focus sessions, utilizing the device's internal IMU (Inertial Measurement Unit) to manage state transitions.

### 2. Interaction Model (The "Physical Lever" UX)

The application functions as a spatial state machine where the device's orientation relative to the gravity vector $\vec{g}$ determines the operational mode:

Tilt Left ($< -45^\circ$ Roll): ACTIVE state. Resumes or starts the current countdown (Work or Break).

Tilt Right ($> 45^\circ$ Roll): PAUSE state. Halts the countdown immediately.

Portrait (Upright in Stand): NEUTRAL/MONITOR state. Displays a high-visibility wall clock while keeping the session progress visible in the background.

Create states like a cube, 6 possible faces (up, down, left, right, front, back).

return also the gravity vector $\vec{g}$

the left and right will be the start and resume 

### 3. Technical Stack

Frontend: React 18 with TypeScript for strict type safety in sensor handling.

Styling: Tailwind CSS for a high-contrast, "glassmorphism" aesthetic optimized for desk visibility.

Sensors: Web DeviceOrientation API (mapped via Beta/Gamma Euler angles).

Native Bridge: Capacitor.js for wrapping the web view into a native Android .apk, enabling persistent background execution and Screen Wake Lock.

Build Tool: Vite (ES Modules) for near-instant HMR during sensor calibration.

### 4. Key Engineering Features

Persistent Dual-State: The UI tracks both Work and Break timers simultaneously, allowing for seamless context switching.

Synthetic Feedback: Implements Web Audio API for frequency-stable beeps and the Vibration API for haptic notification when the device is face-down or tilted.

Orientation Lock: A manual software override to prevent accidental triggers during device transport.

### 5. Roadmap

Sensor Fusion: Transition from raw Euler angles to a Quaternions-based approach to avoid Gimbal Lock in vertical orientations.

Filtering: Implementation of a Complementary or Kalman filter to dampen high-frequency jitter caused by mechanical vibrations on the desk.

Analytics: Local-first data persistence for session tracking.

## General Guidelines
- Code Style: Prioritize clean, documented TypeScript. Use functional components and custom hooks for sensor logic isolation.

- Tone: Technical, structured, and concise. Avoid jargon and buzzwords.

- Architecture: Maintain a clear separation between the hardware-poll loop (IMU data) and the UI state.

## Specific Rules
Sensor Logic: Always handle the case where DeviceOrientationEvent might be undefined or require explicit user permission (iOS logic).

Physics-First: When suggesting filters or state transitions, provide the mathematical reasoning (e.g., using $\vec{g}$ components) where appropriate.

Styling: Adhere strictly to Tailwind CSS v4 utility classes.

## Current State & Notes
- **Deployment Strategy**: The app is set up as a full-screen PWA deployed to **Vercel**. 
  - `main` branch acts as the stable production release.
  - Future work should use feature branches (e.g., `feature/xxx`, `dev`) to leverage Vercel's preview URLs for testing without disrupting the stable PWA installation.
- **UI Architecture**: Implemented a "Gravitational UI" where the central timer block (clock, cycle dots, tilt indicators, mode label, and timer) is housed within a circular container (`w-[22rem] h-[22rem]`).
- **Gravity Math**: The circle rotates smoothly (via CSS transition) to align perfectly with the device's true gravity vector. This is calculated using `atan2(gx, gy)` projected from the `beta` and `gamma` Euler angles, ensuring correct rotation regardless of phone pitch.
- **Next Steps**: Continue polishing the interactions, potentially explore adding Synthetic Feedback (Web Audio / Vibration API, as mentioned in previous plans), and eventually set up the Capacitor/Native Android wrapper if a native `.apk` is preferred over the PWA.
