//components/Timer.tsx
import React, { useEffect, useState } from 'react';

interface TimerProps {
  startTime: Date;
  onTimeUpdate?: (secondsRemaining: number) => void;
}

export default function Timer({ startTime, onTimeUpdate }: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutes in seconds
  const [hasPlayedThreeMin, setHasPlayedThreeMin] = useState(false);
  const [hasPlayedTwoMin, setHasPlayedTwoMin] = useState(false);
  const [hasPlayedOneMin, setHasPlayedOneMin] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const remaining = Math.max(900 - elapsed, 0);
      
      setTimeRemaining(remaining);
      
      if (onTimeUpdate) {
        onTimeUpdate(remaining);
      }

      // Play beep at 3 minutes (180 seconds)
      if (remaining <= 180 && remaining > 179 && !hasPlayedThreeMin) {
        playBeep();
        setHasPlayedThreeMin(true);
      }

      // Play beep at 2 minutes (120 seconds)
      if (remaining <= 120 && remaining > 119 && !hasPlayedTwoMin) {
        playBeep();
        setHasPlayedTwoMin(true);
      }

      // Play beep at 1 minute (60 seconds)
      if (remaining <= 60 && remaining > 59 && !hasPlayedOneMin) {
        playBeep();
        setHasPlayedOneMin(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, hasPlayedThreeMin, hasPlayedTwoMin, hasPlayedOneMin, onTimeUpdate]);

  function playBeep() {
    // Create a simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getTimerColor(): string {
    if (timeRemaining <= 60) return 'bg-red-600 animate-pulse'; // Flashing red at 1 min
    if (timeRemaining <= 120) return 'bg-red-600'; // Red at 2 min
    if (timeRemaining <= 180) return 'bg-yellow-500'; // Yellow at 3 min
    return 'bg-green-600'; // Green otherwise
  }

  function getTextColor(): string {
    if (timeRemaining <= 180) return 'text-white';
    return 'text-white';
  }

  return (
    <div className={`${getTimerColor()} ${getTextColor()} px-4 py-2 rounded-lg font-bold text-lg text-center transition-colors`}>
      ⏱️ {formatTime(timeRemaining)}
    </div>
  );
}