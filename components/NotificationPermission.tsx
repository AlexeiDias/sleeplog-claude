//components/NotificationPermission.tsx
'use client';

import { useEffect, useState } from 'react';
import Button from './Button';

export default function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Show banner if permission not granted
      if (Notification.permission === 'default') {
        setShowBanner(true);
      }
    }
  }, []);

  async function requestPermission() {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setShowBanner(false);
        // Test notification
        new Notification('Notifications Enabled! 🔔', {
          body: 'You will now receive sleep check reminders',
          icon: '/icon-192.png',
        });
      }
    }
  }

  function dismissBanner() {
    setShowBanner(false);
    // Remember dismissal for this session
    sessionStorage.setItem('notificationBannerDismissed', 'true');
  }

  // Don't show if already dismissed this session
  useEffect(() => {
    if (sessionStorage.getItem('notificationBannerDismissed') === 'true') {
      setShowBanner(false);
    }
  }, []);

  if (!showBanner || permission === 'granted') {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="text-3xl">🔔</div>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-1">
            Enable Sleep Check Reminders
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            Get notifications and vibrations when it's time to check on sleeping children. 
            This helps ensure compliance with 15-minute check requirements.
          </p>
          <div className="flex gap-2">
            <Button 
              variant="primary" 
              onClick={requestPermission}
              className="text-sm"
            >
              Enable Notifications
            </Button>
            <Button 
              variant="secondary" 
              onClick={dismissBanner}
              className="text-sm"
            >
              Not Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
