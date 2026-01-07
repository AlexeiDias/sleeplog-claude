//components/Timer.tsx
import React, { useEffect, useState, useRef } from 'react';

interface TimerProps {
  startTime: Date;
  onTimeUpdate?: (secondsRemaining: number) => void;
}

export default function Timer({ startTime, onTimeUpdate }: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutes in seconds
  const [hasPlayedThreeMin, setHasPlayedThreeMin] = useState(false);
  const [hasPlayedTwoMin, setHasPlayedTwoMin] = useState(false);
  const [hasPlayedOneMin, setHasPlayedOneMin] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on user interaction (required for mobile)
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioInitialized(true);
      }
      // Resume if suspended (common on mobile)
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    // Listen for any user interaction to initialize audio
    const events = ['touchstart', 'touchend', 'mousedown', 'click'];
    events.forEach(event => {
      document.addEventListener(event, initAudio, { once: false });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, initAudio);
      });
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const remaining = Math.max(900 - elapsed, 0);
      
      setTimeRemaining(remaining);
      
      if (onTimeUpdate) {
        onTimeUpdate(remaining);
      }

      // Alert at 3 minutes (180 seconds)
      if (remaining <= 180 && remaining > 179 && !hasPlayedThreeMin) {
        triggerAlert('3 minutes remaining');
        setHasPlayedThreeMin(true);
      }

      // Alert at 2 minutes (120 seconds)
      if (remaining <= 120 && remaining > 119 && !hasPlayedTwoMin) {
        triggerAlert('2 minutes remaining - CHECK SOON!');
        setHasPlayedTwoMin(true);
      }

      // Alert at 1 minute (60 seconds)
      if (remaining <= 60 && remaining > 59 && !hasPlayedOneMin) {
        triggerAlert('1 MINUTE LEFT - CHECK NOW!');
        setHasPlayedOneMin(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, hasPlayedThreeMin, hasPlayedTwoMin, hasPlayedOneMin, onTimeUpdate]);

  function triggerAlert(message: string) {
    // 1. Play beep sound (works on desktop and some mobile)
    playBeep();
    
    // 2. Vibrate (works on most mobile devices, even when muted)
    if ('vibrate' in navigator) {
      // Vibration pattern: vibrate for 200ms, pause 100ms, repeat 3 times
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // 3. Show browser notification (if permission granted)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Sleep Check Reminder', {
        body: message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'sleep-timer',
        requireInteraction: true, // Keeps notification visible until dismissed
      });
    }
  }

  function playBeep() {
    try {
      // Ensure audio context is initialized
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // Resume if suspended (required on mobile)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing beep:', error);
    }
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
    return 'text-white';
  }

  function getWarningText(): string {
    if (timeRemaining <= 60) return '⚠️ CHECK NOW!';
    if (timeRemaining <= 120) return '⚠️ Check Soon';
    if (timeRemaining <= 180) return '⚠️ 3 min left';
    return '';
  }

  return (
    <div className="space-y-2">
      <div className={`${getTimerColor()} ${getTextColor()} px-4 py-3 rounded-lg font-bold text-xl text-center transition-colors shadow-lg`}>
        <div className="flex items-center justify-center gap-2">
          <span>⏱️</span>
          <span>{formatTime(timeRemaining)}</span>
        </div>
        {getWarningText() && (
          <div className="text-sm mt-1 font-extrabold">
            {getWarningText()}
          </div>
        )}
      </div>
      
      {/* Mobile-specific visual alert */}
      {timeRemaining <= 60 && (
        <div className="bg-red-100 border-2 border-red-600 text-red-900 px-3 py-2 rounded text-center text-sm font-bold animate-pulse">
          🚨 URGENT: Perform sleep check immediately! 🚨
        </div>
      )}
    </div>
  );
}
