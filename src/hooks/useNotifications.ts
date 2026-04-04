import { useCallback, useEffect, useRef } from 'react';
import { NotificationSound } from '@/types/task';

const SOUND_FILES: Record<NotificationSound, string> = {
  bell: '/sounds/bell.mp3',
  alarm: '/sounds/alarm.mp3',
  gentle: '/sounds/gentle.mp3',
  none: '',
};

export const useNotifications = () => {
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  // Preload audio on mount
  useEffect(() => {
    Object.entries(SOUND_FILES).forEach(([key, url]) => {
      if (url && !audioRefs.current[key]) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.load();
        audioRefs.current[key] = audio;
      }
    });
  }, []);

  const playSound = useCallback(async (sound: NotificationSound = 'bell') => {
    if (sound === 'none' || !SOUND_FILES[sound]) return;
    
    try {
      let audio = audioRefs.current[sound];
      
      if (!audio) {
        audio = new Audio(SOUND_FILES[sound]);
        audioRefs.current[sound] = audio;
      }

      // Reset to start if already playing
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.6;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Audio play blocked or failed:", error.message);
          // Fallback: try to play again on next user interaction if blocked
        });
      }
    } catch (e) {
      console.error('Sound system error:', e);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }, []);

  const sendNotification = useCallback(async (
    title: string,
    options?: NotificationOptions & { sound?: NotificationSound }
  ) => {
    const sound = options?.sound || 'bell';
    playSound(sound);

    const hasPermission = await requestPermission();
    if (!hasPermission) {
      console.warn("Notification permission not granted");
      return null;
    }

    try {
      // Check for Service Worker registration for background notifications
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'task-reminder',
            renotify: true,
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            ...options,
          });
          return;
        }
      }

      // Fallback to standard Notification API
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'task-reminder',
        requireInteraction: true,
        ...options,
      });

      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }

      notification.addEventListener('click', () => {
        notification.close();
        window.focus();
      });

      return notification;
    } catch (e) {
      console.error('Failed to send notification:', e);
      return null;
    }
  }, [requestPermission, playSound]);

  return { sendNotification, requestPermission, playSound };
};
